export interface Driver {
  run: (dataset: string, query_spec: QuerySpec, unweight_columns: boolean, cb: (err:string, results: any)=> void) => void,
  get_stats: (dataset: string, cb: ()=>void) => void,
  get_tables: (cb: (tables: TableMeta[])=>void) => void,
  get_datasets: (cb: ()=>void) => void,
  get_columns: (dataset: string, cb: (columns?: ColumnMeta[])=>void) => void,
  clear_cache: (dataset: string, cb: ()=>void) => void,
  drop_dataset: (dataset: string, cb: ()=>void) => void,
  add_samples: (dataset: string, subset: string, samples: Object[], cb: ()=>void) => void,
  supports_percentiles: () => void,
  validate: () => void,
  predict_column_types: (a: ColumnSample[]) => ColumnMeta[],
  default_bucket?: () => string | Object | string;
  extra_buckets?: () => string | Object | string;
  extra_metrics?: () => string | Object | string;
  default_table?: string,
  SEPARATOR?: string,
}
export interface TableMeta {
  table_name: string,
}
export interface ColumnMeta {
  name: string,
  type_str: string,
  display_name?: string,
  max_value?: number,
  min_value?: number,
  time_col?: boolean,
  groupable?: "true",
  final_type?: string,
}
export type ColumnSampleKey = "integer" | "string" | "set";
export type ColumnSample = Record<ColumnSampleKey, { [K: string]: any }>;
export interface Row {
  _id?: { [key: string]: any };
  count?: number,
  weighted_count?: number,
  distinct?: number,
  // this can collide with above
  [col: string]: any,
}
export enum QuerySpecView {
  table = 'table',
  time = 'time',
  hist = 'hist',
}
export type QuerySpecFilter = {
  column: string,
  conditions: Array<{ op: string, value: string }>,
}
export interface QuerySpec {
  view: QuerySpecView,
  opts: {
    cols: string[],
    dims: string[],
    filters: QuerySpecFilter[],
    custom_fields: string[],
    agg: string,
    time_bucket: number,
    hist_bucket: number,
    hist_bucket_str: string,
    limit: number,
    weight_col: string,
    start_ms: number,
    end_ms: number,
  },
  col_config: {
    [column: string]: {
      final_type: string,
    },
  },
  meta: {
    metadata: {
      time_col: string,
      columns: {
        [column: string]: {
          type_str: string,
        },
      },
      col_types: {
        integer: {
          time: string,
          integer_time: string,
        }
      }
    }
  },
}


type QueryPipeline = {
  view: QueryView,
  opts: Object,
  col_config: Object,
  params?: Object,
  meta?: Object,
};
type QueryView = "dist" | "table" | "samples" | "time" | "samples" | "overview";
type QueryParams = {
  view: QueryView,
  baseview: QueryView,

  table: string,
  dims: string[],
  time_field: string,
  custom_fields: string[],
  custom: Object,
  limit: number,
  sort_by: string,
  stacking: string,
  dim_one: string,
  dim_two: string,

  field_two: string,
  event_field: string,

  start_ms: number,
  end_ms: number,
  start_str: string,
  end_str: string,
  start_date: Date,
  end_date: Date,

  weight_col: string,
  compare_delta: number,
  compare_str: string,

  hist_bucket: number,
  hist_bucket_str: string,
  time_bucket: number,
  time_divisor: number,

  cols: string[],
  filters: QuerySpecFilter[],
  compare_filters: QuerySpecFilter[],
  agg: string,
};
