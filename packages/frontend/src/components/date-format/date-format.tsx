import { useAppContext } from '@/context/app-context';
import i18next from 'i18next';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';

type IProps = {
  date: Date | string;
};

export const useDateFormat = () => {
  const { userSettings } = useAppContext();
  const { timeZone } = userSettings;

  const locale = i18next.language;

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

  const locale = i18next.language;

  const formattedDate = new Date(date).toLocaleString(locale, { timeZone });

  return <>{formattedDate}</>;
};

export const RelativeDateFormat = ({ date }: IProps) => {
  dayjs.extend(relativeTime);
  return <>{dayjs().to(new Date(date))}</>;
};
