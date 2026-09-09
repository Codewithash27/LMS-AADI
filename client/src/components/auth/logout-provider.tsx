import { useAuth } from "@/hooks/use-auth";
import { LogoutOverlay } from "./logout-overlay";

type LogoutProviderProps = {
  children: React.ReactNode;
};

export function LogoutProvider({ children }: LogoutProviderProps) {
  const { isLoggingOut } = useAuth();
  
  return (
    <>
      {children}
      <LogoutOverlay isVisible={isLoggingOut} />
    </>
  );
}