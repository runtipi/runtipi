import './button-tile.css';

interface ButtonTileProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

export const ButtonTile: React.FC<ButtonTileProps> = ({ title, subtitle, icon, action }: ButtonTileProps) => {
  return (
    <button onClick={action} className="col-sm-6 col-lg-4 button-tile p-2 pt-0 pb-0 mb-0" type="button">
      <div className="card card-sm card-link ml-0">
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
