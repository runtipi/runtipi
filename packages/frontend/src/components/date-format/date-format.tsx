import { useAppContext } from '@/context/app-context';
import Cookies from 'js-cookie';

type IProps = {
  date: Date | string;
};

export const useDateFormat = () => {
  const { userSettings } = useAppContext();
  const { timeZone } = userSettings;

  const locale = Cookies.get('tipi-locale') || 'en-US';

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

  const locale = Cookies.get('tipi-locale') || 'en-US';

  const formattedDate = new Date(date).toLocaleString(locale, { timeZone });

  return <>{formattedDate}</>;
};
