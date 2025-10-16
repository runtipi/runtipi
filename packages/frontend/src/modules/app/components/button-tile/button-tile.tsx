import clsx from 'clsx';
import './button-tile.css';

interface ButtonTileProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  className?: string;
  action: () => void;
}

export const ButtonTile = ({ title, subtitle, icon, action, className }: ButtonTileProps) => {
  return (
    <button onClick={action} className={clsx('col-sm-6 col-lg-4 button-tile p-2 pt-0 pb-0 mb-0', className)} type="button">
      <div className="card card-sm ml-0 link-primary link-primary-subtle">
        <div className="card-body d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
            {icon}
          </div>
          <div>
            <div className="fw-bolder text-start">{title}</div>
            <div className="text-muted text-start">{subtitle}</div>
          </div>
        </div>
      </div>
    </button>
  );
};
