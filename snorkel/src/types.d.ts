declare module "snorkel" {
  export interface Driver {
    run: (dataset, query_spec: QuerySpec, unweight_columns, cb) => void,
    get_stats: (dataset, cb) => void,
    get_datasets: (cb) => void,
    get_columns: (dataset, cb) => void,
    clear_cache: (dataset, cb) => void,
    drop_dataset: (dataset, cb) => void,
    add_samples: (dataset, subset, samples, cb) => void,
    supports_percentiles: () => void,
    validate: () => void,
    predict_column_types: (a: ColumnSamples) => ColumnMeta[],
  }
  interface ColumnMeta {
    name: string,
    type_str: string,
    max_value?: number,
    min_value?: number,
  }
  interface ColumnSamples {
    integer: Object,
    string: Object,
    set: Object,
  }
  interface Row {
    _id?: { [key: string]: any };
    count?: number,
    weighted_count?: number,
    distinct?: number,
    // this can collide with above
    [col: string]: any,
  }
  enum QuerySpecView {
    table = 'table',
    time = 'time',
    hist = 'hist',
  }
  export interface QuerySpec {
    view: QuerySpecView,
    opts: {
      cols: string[],
      dims: string[],
      filters: string[],
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
}
