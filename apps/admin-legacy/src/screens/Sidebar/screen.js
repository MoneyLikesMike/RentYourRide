import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./index.scss";
import ScrollService from "../../services/scroll";
import { images } from "../../assets/images/index";

const { logo, finish, teamwork, validation } = images;
const tabs = [
  {
    title: "members",
    href: "/members",
    img: teamwork
  },
  {
    title: "trips",
    href: "/trips",
    img: finish
  },
  {
    title: "validation",
    href: "/validation",
    img: validation
  }
];

const Sidebar = () => {
  let activeTabHref = window.location.pathname.split("/")[1];
  const [activeTab, setTab] = useState(
    activeTabHref === "" ? "members" : activeTabHref
  );

  const onSetTab = tab => {
    ScrollService.toTop();
    setTab(tab);
  };

  return (
    <div className="container">
      <Link onClick={() => onSetTab("members")} to="/members">
        <img src={logo} className="logo" alt="logo" />
      </Link>
      <div className="links-wrapper">
        {tabs.map(t => (
          <Link
            key={t.title}
            onClick={() => onSetTab(t.title)}
            to={t.href}
            className={activeTab === t.title ? "active-link" : "link"}
          >
            <img src={t.img} className="link-img" alt={t.title} />
            {t.title}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
