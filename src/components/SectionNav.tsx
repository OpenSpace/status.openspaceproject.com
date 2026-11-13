import { useEffect, useState } from 'react';

export interface NavSection {
  id: string;
  label: string;
}

/**
 * A navigation bar that sticks to the top of the page and links to the sections of the
 * page. The section that is currently being viewed is highlighted
 */
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((e): e is HTMLElement => e !== null);

    // A section counts as active while it crosses a thin band near the top of the
    // viewport, just below the navigation bar
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -75% 0px' }
    );
    elements.forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className={'section-nav'} aria-label={'Sections'}>
      <ul>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={active === s.id ? 'location' : undefined}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
