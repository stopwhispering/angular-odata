import { Utils } from '../utils/utils';
import { ODataService } from '../odata-service/odata.service';
import { Observable } from 'rxjs';
import { ODataResponse } from '../odata-response/odata-response';
import { ODataQueryType } from './odata-query-type';

export abstract class ODataQueryBase implements ODataQueryType {
  // URL QUERY PARTS
  public static readonly SEPARATOR = '&';
  public static readonly PATHSEP = '/';

  // OPTIONS NAMES
  public static readonly SELECT = 'select';
  public static readonly RAWFILTER = 'rawFilter';
  public static readonly FILTER = 'filter';
  public static readonly SEARCH = 'search';
  public static readonly GROUP_BY = 'groupBy';
  public static readonly TRANSFORM = 'transform';
  public static readonly ORDER_BY = 'orderBy';
  public static readonly TOP = 'top';
  public static readonly SKIP = 'skip';
  public static readonly EXPAND = 'expand';

  // SEGMENT NAMES
  public static readonly METADATA = 'metadata';
  public static readonly ENTITY_SET = 'entitySet';
  public static readonly ENTITY_KEY = 'entityKey';
  public static readonly SINGLETON = 'singleton';
  public static readonly TYPE_NAME = 'typeName';
  public static readonly PROPERTY = 'property';
  public static readonly NAVIGATION_PROPERTY = 'navigationProperty';
  public static readonly REF = 'ref';
  public static readonly VALUE = 'value';
  public static readonly COUNT = 'count';
  public static readonly FUNCTION_CALL = 'functionCall';
  public static readonly ACTION_CALL = 'actionCall';

  // CONSTANT SEGMENTS
  public static readonly $METADATA = '$metadata';
  public static readonly $REF = '$ref';
  public static readonly $VALUE = '$value';
  public static readonly $COUNT = '$count';

  // VARIABLES
  public odataService: ODataService;
  public queryString: string;

  constructor(odataService: ODataService) {
    Utils.requireNotNullNorUndefined(odataService, 'odataService');
    this.odataService = odataService;
    this.queryString = "";
  }

  // QUERY EXECUTION
  get(options?): Observable<ODataResponse> {
    return this.odataService.get(this, options);
  }

  post(body: any, options?): Observable<ODataResponse> {
    return this.odataService.post(this, body, options);
  }

  patch(body: any, etag?: string, options?): Observable<ODataResponse> {
    return this.odataService.patch(this, body, etag, options);
  }

  put(body: any, etag?: string, options?): Observable<ODataResponse> {
    return this.odataService.put(this, body, etag, options);
  }

  delete(etag?: string, options?): Observable<ODataResponse> {
    return this.odataService.delete(this, etag, options);
  }
}
