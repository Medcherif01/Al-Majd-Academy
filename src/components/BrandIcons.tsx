interface IconProps {
  className?: string;
}

/**
 * Custom architectural academic crest for Al-Majd / DaTeacher
 */
export function AcademyCrestIcon({ className = 'w-7 h-7' }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="32" height="32" rx="9" fill="#0B1633" />
      <path
        d="M18 8.5L28 13.5L18 18.5L8 13.5L18 8.5Z"
        fill="#F59E0B"
      />
      <path
        d="M10.5 17.5C13 17.5 15.8 18.4 18 20C20.2 18.4 23 17.5 25.5 17.5V25.5C23 25.5 20.2 26.3 18 27.8C15.8 26.3 13 25.5 10.5 25.5V17.5Z"
        fill="#3B82F6"
        fillOpacity="0.92"
      />
      <path
        d="M18 20V27.8"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Bespoke Student Login emblem (Royal Cobalt + Sky Academic Cap & Open Folio)
 */
export function StudentPortalEmblem({ className = 'w-14 h-14' }: IconProps) {
  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="56" height="56" rx="16" fill="url(#studentGrad)" />
      <path
        d="M28 13L42 20L28 27L14 20L28 13Z"
        fill="#FFFFFF"
      />
      <path
        d="M39 22.5V30"
        stroke="#FCD34D"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="39" cy="31.5" r="2" fill="#FCD34D" />
      <path
        d="M17.5 26.5C21 26.5 24.8 27.8 28 30.2C31.2 27.8 35 26.5 38.5 26.5V39C35 39 31.2 40.1 28 42.3C24.8 40.1 21 39 17.5 39V26.5Z"
        fill="#DBEAFE"
      />
      <path
        d="M28 30.2V42.3"
        stroke="#1D4ED8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="studentGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#0B3B8C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Bespoke Teacher Login emblem (Midnight Navy + Sovereign Gold Lectern Shield & Key)
 */
export function TeacherPortalEmblem({ className = 'w-14 h-14' }: IconProps) {
  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="56" height="56" rx="16" fill="url(#teacherGrad)" />
      <path
        d="M28 11.5L40 16.5V27.2C40 35.1 34.9 41.3 28 44.5C21.1 41.3 16 35.1 16 27.2V16.5L28 11.5Z"
        fill="#1E293B"
        stroke="#F59E0B"
        strokeWidth="2.2"
      />
      <circle cx="28" cy="23.5" r="4" fill="#FCD34D" />
      <path
        d="M21.5 34.5C22.4 30.8 25 29 28 29C31 29 33.6 30.8 34.5 34.5"
        stroke="#FEF3C7"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M35.5 19.5L37.8 21.8L41.5 17.8"
        stroke="#34D399"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="teacherGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#091124" />
        </linearGradient>
      </defs>
    </svg>
  );
}
