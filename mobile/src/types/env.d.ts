import "lucide-react-native";

declare global {
  const process: {
    env: Record<string, string | undefined>;
  };
}

declare module "lucide-react-native" {
  interface LucideProps {
    color?: string;
    fill?: string;
  }
}

export {};
