import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
      primary: "bg-black text-white hover:bg-white hover:text-black hover:border-2 hover:border-black",
      outline: "bg-white text-black border-2 border-black hover:bg-black hover:text-white",
      ghost: "bg-transparent text-black hover:bg-black hover:text-white",
    };

    const sizeStyles = {
      sm: "px-3 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    return (
      <button ref={ref} className={combinedStyles} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;