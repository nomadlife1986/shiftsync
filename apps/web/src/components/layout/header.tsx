'use client';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="bg-[#fafafa] px-6 py-[18px] flex items-center justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-gray-900 tracking-[-0.01em]">{title}</h2>
        {subtitle && <p className="text-[13px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
