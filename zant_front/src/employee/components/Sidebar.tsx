import { useState } from 'react';

interface NavItem {
  id: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Pulpit' },
  { id: 'case', label: 'Sprawa: 24/11/004' },
  { id: 'tasks', label: 'Moje zadania' },
  { id: 'archive', label: 'Archiwum' },
  { id: 'settings', label: 'Ustawienia' },
];

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState('case');

  return (
    <aside className="w-[260px] bg-bg-panel border-r border-border flex flex-col p-5 shrink-0 max-[900px]:w-full max-[900px]:border-r-0 max-[900px]:border-b">
      <nav className="flex flex-col gap-1.5 max-[900px]:flex-row max-[900px]:overflow-x-auto">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`px-4 py-2.5 text-sm font-semibold cursor-pointer border-l-4 transition-all duration-200
              max-[900px]:whitespace-nowrap max-[900px]:border-l-0 max-[900px]:border-b-4
              ${activeItem === item.id
                ? 'bg-primary-light text-primary-dark border-l-primary-main max-[900px]:border-l-0 max-[900px]:border-b-primary-main'
                : 'text-text-muted border-transparent hover:bg-gray-50 hover:text-primary-main'
              }`}
            onClick={() => setActiveItem(item.id)}
          >
            {item.label}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
