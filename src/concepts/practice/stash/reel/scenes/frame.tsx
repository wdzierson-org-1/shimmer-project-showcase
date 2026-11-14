import { useContext, type ReactNode } from 'react';
import { SceneContext } from '../clock';

/** The part of a scene the camera moves over. */
export function World({ children, className }: { children: ReactNode; className?: string }) {
  const scene = useContext(SceneContext);
  return <div ref={scene?.world} className={`sx-world${className ? ` ${className}` : ''}`}>{children}</div>;
}
/** The part of a scene that stays put on screen. */
export const Hud = ({ children }: { children: ReactNode }) => <div className="sx-hud">{children}</div>;
