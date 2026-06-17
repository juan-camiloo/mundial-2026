import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import appLogo from "../assets/app-logo.png";
import { supabase } from "../lib/supabase";

type NavItem = {
  to: string;
  label: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Inicio", Icon: Home },
  { to: "/partidos", label: "Partidos", Icon: CalendarDays },
  { to: "/mis-pronosticos", label: "Mis pronósticos", Icon: ClipboardList },
  { to: "/mi-final-sonada", label: "Mi final soñada", Icon: Sparkles },
];

const LOGO_ONLY_ROUTES = new Set([
  "/login",
  "/register",
  "/cambiar-contrase\u00f1a",
  "/contrase\u00f1a-nueva",
  "/cambiar-contraseña",
  "/contraseña-nueva",
  "/auth/confirm",
]);

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rankingMenuOpen, setRankingMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminHovered, setAdminHovered] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const navLinksRef = useRef<HTMLDivElement | null>(null);
  const rankingDropdownRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isLogoOnlyRoute = LOGO_ONLY_ROUTES.has(location.pathname);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isActive = (path: string) =>
    location.pathname === path ? "navbar-link active" : "navbar-link";

  const closeMenus = () => {
    setMenuOpen(false);
    setRankingMenuOpen(false);
  };

  const scrollRankingIntoView = () => {
    const navLinks = navLinksRef.current;
    const rankingDropdown = rankingDropdownRef.current;
    if (!navLinks || !rankingDropdown || navLinks.scrollWidth <= navLinks.clientWidth) return;

    const navRect = navLinks.getBoundingClientRect();
    const rankingRect = rankingDropdown.getBoundingClientRect();
    const centeredOffset = (navLinks.clientWidth - rankingRect.width) / 2;
    const targetLeft = navLinks.scrollLeft + rankingRect.left - navRect.left - centeredOffset;
    const maxLeft = navLinks.scrollWidth - navLinks.clientWidth;

    navLinks.scrollTo({
      left: Math.max(0, Math.min(targetLeft, maxLeft)),
      behavior: "smooth",
    });
  };

  const handleRankingMenuClick = () => {
    scrollRankingIntoView();
    setRankingMenuOpen((open) => !open);
  };

  useEffect(() => {
    let ignore = false;

    const checkUserAndIsAdmin = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        if (!ignore) {
          setHasSession(false);
          setIsAdmin(false);
          setUserName(null);
        }
        if (userError) console.log(userError.message);
        return;
      }

      const metadataName =
        typeof userData.user.user_metadata?.name === "string"
          ? userData.user.user_metadata.name
          : null;

      if (!ignore) {
        setHasSession(true);
        setUserName(metadataName);
      }

      if (isLogoOnlyRoute) {
        if (!ignore) setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("is_admin, name")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!ignore) {
        setIsAdmin(Boolean(data?.is_admin));
        setUserName(data?.name ?? metadataName);
      }
    };

    checkUserAndIsAdmin();

    return () => {
      ignore = true;
    };
  }, [isLogoOnlyRoute]);

  useEffect(() => {
    const navLinks = navLinksRef.current;
    if (!navLinks) return;

    const intermediateNav = window.matchMedia("(min-width: 701px)");

    const alignLinksToEnd = () => {
      if (intermediateNav.matches) {
        navLinks.scrollLeft = navLinks.scrollWidth;
      }
    };

    window.requestAnimationFrame(alignLinksToEnd);
    intermediateNav.addEventListener("change", alignLinksToEnd);
    window.addEventListener("resize", alignLinksToEnd);

    return () => {
      intermediateNav.removeEventListener("change", alignLinksToEnd);
      window.removeEventListener("resize", alignLinksToEnd);
    };
  }, [isAdmin, location.pathname]);

  const logoContent = (
    <>
      <div className="navbar-logo-icon">
        <img src={appLogo} alt="" aria-hidden="true" />
      </div>
      <span className="navbar-logo-copy">
        <span className="navbar-logo-text">
          SUPER POLLA<span> INGELOX</span>
        </span>
        {hasSession === true && userName ? (
          <span className="navbar-logo-user">{userName}</span>
        ) : null}
      </span>
    </>
  );

  const shouldUseLogoOnly = isLogoOnlyRoute || hasSession !== true;

  if (shouldUseLogoOnly) {
    return (
      <nav className="navbar navbar-logo-only" aria-label="Marca">
        <div className="navbar-logo">{logoContent}</div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        {logoContent}
      </Link>

      <div className="navbar-spacer" />

      <div
        ref={navLinksRef}
        className={`navbar-links${menuOpen ? " open" : ""}${isAdmin ? " admin-mode" : ""}`}
      >
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <Link to={to} className={isActive(to)} onClick={closeMenus} key={to}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </Link>
        ))}

        <div className="navbar-dropdown" ref={rankingDropdownRef}>
          <button
            type="button"
            className={isActive("/ranking")}
            aria-expanded={rankingMenuOpen}
            aria-haspopup="menu"
            onClick={handleRankingMenuClick}
          >
            <Trophy size={16} aria-hidden="true" />
            Ranking
            <ChevronDown
              className={`navbar-dropdown-chevron${rankingMenuOpen ? " open" : ""}`}
              size={14}
              aria-hidden="true"
            />
          </button>

          {rankingMenuOpen ? (
            <div className="navbar-dropdown-menu" role="menu">
              <Link to="/ranking?vista=jugadores" role="menuitem" onClick={closeMenus}>
                Jugadores
              </Link>
              <Link to="/ranking?vista=torneo" role="menuitem" onClick={closeMenus}>
                Torneo
              </Link>
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          <Link
            to="/panel-de-administrador"
            className={`${isActive("/panel-de-administrador")} navbar-admin-link`}
            onClick={closeMenus}
            onMouseEnter={() => setAdminHovered(true)}
            onMouseLeave={() => setAdminHovered(false)}
            style={{
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
              // Colapsado por defecto, se expande al hacer hover
              maxWidth: adminHovered ? "240px" : "40px",
              transition: "max-width 0.3s ease",
              whiteSpace: "nowrap",
            }}
            title="Panel de Administrador"
          >
            <Shield size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span
              className="navbar-admin-label"
              style={{
                marginLeft: "6px",
                opacity: adminHovered ? 1 : 0,
                transition: "opacity 0.2s ease 0.05s",
              }}
            >
              Panel de Administrador
            </span>
          </Link>
        ) : null}

      </div>

      <button
        className="navbar-btn navbar-logout-btn"
        type="button"
        onClick={handleSignOut}
        title="Cerrar sesión"
      >
        <LogOut size={16} aria-hidden="true" />
        <span className="navbar-logout-label">Cerrar sesión</span>
      </button>

      <button
        className="navbar-toggle"
        type="button"
        onClick={() => {
          setMenuOpen(!menuOpen);
          setRankingMenuOpen(false);
        }}
        aria-label="Menú"
      >
        {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>
    </nav>
  );
}
