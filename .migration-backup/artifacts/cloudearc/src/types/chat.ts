export type Message = {
  role: "user" | "ai";
  content: string;
};

export type AIResponse = {
  message: string;
  files?: {
    path: string;
    content: string;
  }[];
};
