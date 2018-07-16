export interface Driver {
  run: (dataset: string, query_spec: QuerySpec, unweight_columns: boolean, cb: (err:string, results: any)=> void) => void,
  get_stats: (dataset: string, cb: ()=>void) => void,
  get_tables: (cb: ()=>void) => void,
  get_datasets: (cb: ()=>void) => void,
  get_columns: (dataset: string, cb: ()=>void) => void,
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
export interface ColumnMeta {
  name: string,
  type_str: string,
  display_name?: string,
  max_value?: number,
  min_value?: number,
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
