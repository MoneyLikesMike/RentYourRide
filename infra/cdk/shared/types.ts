export namespace Types {
  export type NodeEnvironment = "development" | "staging" | "production";
  export type Branches = "development" | "staging" | "main";
  export type AppType = "Web" | "Admin" | "Backend";
  export type CDKEnvironment = {
    region: string;
    account: string;
  };
}
