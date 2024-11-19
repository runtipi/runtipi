import { useAppContext } from '@/context/app-context';
import { getCurrentLocale } from '@/lib/i18n/locales';

type IProps = {
  date: Date | string;
};

export const useDateFormat = () => {
  const { userSettings } = useAppContext();
  const { timeZone } = userSettings;

  const locale = getCurrentLocale();

  const formatDate = (date?: Date | string) => {
    if (!date) return 'Invalid date';

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return 'Invalid date';

    return new Date(date).toLocaleString(locale, { timeZone });
  };

  return formatDate;
};

export const DateFormat = ({ date }: IProps) => {
  const { userSettings } = useAppContext();
  const { timeZone } = userSettings;

  const locale = getCurrentLocale();

  const formattedDate = new Date(date).toLocaleString(locale, { timeZone });

  return <>{formattedDate}</>;
};
