import { ODataEntitySetResource, ODataEntityResource, ODataSingletonResource, HttpOptions } from '../resources';
import { ODataClient } from "../client";
import { EntityKey } from '../types';
import { ODataCollection } from '../models/collection';
import { ODataModel } from '../models/model';
import { ODataEntityConfig } from '../configs/entity';
import { Observable, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';

export class ODataEntityService<T> {
  constructor(protected client: ODataClient, protected name: string, protected entityType?: string) { }

  public entities(): ODataEntitySetResource<T> {
    return this.client.entitySet<T>(this.name, this.entityType);
  }

  public entity(key?: EntityKey<T>): ODataEntityResource<T> {
    return this.entities()
      .entity(key);
  }

  /*
  public model<M extends ODataModel<T>>(entity?: Partial<T>): M {
    return this.entity(entity).asModel<M>(entity);
  }

  public collection<C extends ODataCollection<T, ODataModel<T>>>(entities?: Partial<T>[]): C {
    return this.entities().asCollection<C>(entities);
  }
  */

  // Models
  public attach<M extends ODataModel<T>>(value: M): M;
  public attach<C extends ODataCollection<T, ODataModel<T>>>(value: C): C;
  public attach(value: any): any {
    if (value instanceof ODataModel) {
      return value.attach(this.entities().entity(value.toEntity()));
    } else if (value instanceof ODataCollection) {
      return value.attach(this.entities());
    }
  }

  // Service Config 
  get apiConfig() {
    return this.client.apiConfigForType(this.entityType);
  }

  // Service Config 
  get serviceConfig() {
    return this.apiConfig.serviceConfigForName(this.name);
  }

  // Entity Config 
  get entityConfig() {
    return this.apiConfig.entityConfigForType<T>(this.entityType);
  }

  public create(entity: Partial<T>, options?: HttpOptions): Observable<T> {
    return this.entities()
      .post(entity, options)
      .pipe(map(({entity}) => entity));
  }

  public update(entity: Partial<T>, options?: HttpOptions): Observable<T> {
    const odata = this.apiConfig.options.helper;
    const etag = odata.etag(entity);
    const res = this.entity(entity);
    if (res.segment.key().empty())
      return throwError("Resource without key");
    return this.entity(entity as EntityKey<T>)
      .put(entity, Object.assign({etag}, options || {}))
      .pipe(map(({entity}) => entity));
  }

  public assign(entity: Partial<T>, attrs: Partial<T>, options?: HttpOptions): Observable<T> {
    const odata = this.apiConfig.options.helper;
    const etag = odata.etag(entity);
    const res = this.entity(entity);
    if (res.segment.key().empty())
      return throwError("Resource without key");
    return res.patch(attrs, Object.assign({etag}, options || {}))
      .pipe(map(({entity: newentity, meta}) => newentity ? newentity : 
        Object.assign(entity, attrs, meta.annotations) as T));
  }

  public destroy(entity: Partial<T>, options?: HttpOptions) {
    const odata = this.apiConfig.options.helper;
    const etag = odata.etag(entity);
    const res = this.entity(entity);
    if (res.segment.key().empty())
      return throwError("Resource without key");
    return res.delete(Object.assign({etag}, options || {}));
  }

  // Shortcuts
  public fetchOrCreate(entity: Partial<T>, options?: HttpOptions): Observable<T> {
    return this.entity(entity).fetch(options)
      .pipe(catchError((error: HttpErrorResponse) => {
        if (error.status === 404)
          return this.create(entity, options);
        else
          return throwError(error);
      }));
  }

  public save(entity: Partial<T>, options?: HttpOptions) {
    return this.entity(entity).segment.key().empty() ? 
      this.create(entity, options) : 
      this.update(entity, options);
  }
}
