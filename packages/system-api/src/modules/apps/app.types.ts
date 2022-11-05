export interface AppEntityType {
  id: string;
  config: Record<string, string>;
  exposed: boolean;
  domain?: string;
}
