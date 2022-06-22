import { Tag, TagLabel } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';
import AppLogo from '../../../components/AppLogo/AppLogo';
import { AppCategoriesEnum } from '../../../generated/graphql';
import { colorSchemeForCategory, limitText } from '../helpers/table.helpers';

type App = {
  id: string;
  name: string;
  categories: string[];
  short_desc: string;
  image: string;
};

const AppStoreTile: React.FC<{ app: App }> = ({ app }) => {
  return (
    <Link href={`/app-store/${app.id}`} passHref>
      <div key={app.id} className="p-2 rounded-md app-store-tile flex items-center group">
        <AppLogo src={app.image} className="group-hover:scale-105 transition-all" />
        <div className="ml-2">
          <div className="font-bold">{limitText(app.name, 20)}</div>
          <div className="text-sm mb-1">{limitText(app.short_desc, 45)}</div>
          {app.categories?.map((category) => (
            <Tag colorScheme={colorSchemeForCategory[category as AppCategoriesEnum]} className="mr-1" borderRadius="full" key={`${app.id}-${category}`} size="sm" variant="solid">
              <TagLabel>{category.toLocaleLowerCase()}</TagLabel>
            </Tag>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default AppStoreTile;
