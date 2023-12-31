import { PaginationResponseDto } from '@common/dtos/pagination.response.dto';
import { QueryOptionsRequestDto } from '@common/dtos/query-options.request.dto';
import { ExceptionCodes } from '@common/exceptions/constants/exception-codes.enum';
import { ExceptionFactory } from '@common/exceptions/exception.factory';
import { BaseDocument } from '@database/schemas/types/document.base';
import {
  FilterQuery,
  Model,
  ProjectionType,
  QueryOptions,
  Types,
} from 'mongoose';
import {
  stringToSearchObject,
  stringToSortObject,
} from '../transforms/query-options.transform';
import { BaseRepositoryInterface } from '../types/repository.base.interface';
import { InternalServerErrorException } from '@nestjs/common';

export class BaseRepository<T extends BaseDocument>
  implements BaseRepositoryInterface<T>
{
  protected constructor(private readonly model: Model<T>) {}

  async create(dto: T | any): Promise<T> {
    const createdDocument = await this.model.create(dto);
    return createdDocument;
  }

  async findOneById(
    id: Types.ObjectId | string,
    projection?: ProjectionType<T>,
  ): Promise<T> {
    const document = await this.model.findById(id, projection, { lean: true });
    if (!document || document.deletedAt) {
      throw ExceptionFactory.create(
        ExceptionCodes.DOCUMENT_NOT_FOUND,
        `${this.model.modelName} not found`,
      );
    }
    return document as T;
  }

  async findOneByConditions(
    conditions: FilterQuery<T> = {},
    projection?: ProjectionType<T>,
  ): Promise<T> {
    const document = await this.model.findOne(
      { ...conditions, deletedAt: null },
      projection,
      { lean: true },
    );
    if (!document) {
      throw ExceptionFactory.create(
        ExceptionCodes.DOCUMENT_NOT_FOUND,
        `${this.model.modelName} not found`,
      );
    }
    return document as T;
  }

  async findAll(
    conditions?: FilterQuery<T>,
    queryOptions?: QueryOptionsRequestDto,
    projection?: ProjectionType<T>,
    options?: QueryOptions<T>,
  ): Promise<Array<T>> {
    const { page, pageSize, sort, search } = queryOptions;
    if (page >= -1 && pageSize >= 0) {
      throw new InternalServerErrorException(
        `Use pagination() instead of findAll() with ${{ page, pageSize }}`,
      );
    }

    const sortObject = stringToSortObject(sort);
    const searchObject = stringToSearchObject(search);

    const documents = await this.model
      .find(
        { ...conditions, ...searchObject, deletedAt: null },
        projection,
        options,
      )
      .sort(sortObject)
      .lean();
    if (!documents) {
      throw ExceptionFactory.create(
        ExceptionCodes.DOCUMENT_NOT_FOUND,
        `${this.model.modelName}s not found`,
      );
    }
    return documents as Array<T>;
  }

  async update(id: Types.ObjectId | string, dto: Partial<T>): Promise<T> {
    const updatedDocument = await this.model.findOneAndUpdate(
      { _id: id, deletedAt: null },
      dto,
      { new: true },
    );
    return updatedDocument;
  }

  async softDelete(id: Types.ObjectId | string): Promise<boolean> {
    const document = await this.model.findById(id);
    if (!document || document.deletedAt) {
      throw ExceptionFactory.create(
        ExceptionCodes.DOCUMENT_NOT_FOUND,
        `${this.model.modelName} not found`,
      );
    }
    const deletedDocument = await this.model.findByIdAndUpdate(id, {
      deleteAt: new Date(),
    });
    return Boolean(deletedDocument);
  }

  async permanentlyDelete(id: Types.ObjectId | string): Promise<boolean> {
    const document = await this.model.findById(id);
    if (!document || document.deletedAt) {
      throw ExceptionFactory.create(
        ExceptionCodes.DOCUMENT_NOT_FOUND,
        `${this.model.modelName} not found`,
      );
    }
    const deletedDocument = await this.model.findByIdAndDelete(id);
    return Boolean(deletedDocument);
  }

  async paginate<T>(
    conditions?: FilterQuery<T>,
    queryOptions?: QueryOptionsRequestDto,
  ): Promise<{ data: T[]; spec: PaginationResponseDto }> {
    const { page, pageSize, sort, search } = queryOptions;

    const sortObject = stringToSortObject(sort);
    const searchObject = stringToSearchObject(search);

    const documents = this.model.find({ ...conditions, ...searchObject });
    const total = await documents.clone().countDocuments();

    if (pageSize >= 1) {
      documents.limit(pageSize);
      if (page >= 0) documents.skip((page - 1) * pageSize);
    }
    documents.sort(sortObject);

    return {
      data: await documents.lean(),
      spec: {
        currentPage: page ?? -1,
        pageSize: pageSize ?? -1,
        total,
      },
    };
  }
}
