import { allTimezones, useTimezoneSelect } from 'react-timezone-select';

type Props = {
  id?: string;
  timeZone?: string;
  onChange: (timeZone: string) => void;
};

/**
 * Native select listing the time zones, used in the settings rows.
 */
export const TimeZoneField = ({ id, timeZone, onChange }: Props) => {
  const { options, parseTimezone } = useTimezoneSelect({ labelStyle: 'abbrev', timezones: allTimezones });
  const zone = parseTimezone(timeZone || 'Etc/GMT').value || 'Etc/GMT';

  return (
    <select id={id} className="rt-field" value={zone} onChange={(e) => e.target.value && onChange(e.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
