export declare enum SortOrder {
    ASC = "ASC",
    DESC = "DESC"
}
export declare class BasePaginationQueryDto {
    page: number;
    pageSize: number;
    order: SortOrder;
    searchTerm?: string;
}
