import React, { useState } from "react";
import { withRouter } from "react-router-dom";
import "./index.scss";

const Tabs = ({ tabs, params, selected }) => {
  const [selectedTab, setTab] = useState(selected ? selected : tabs[0].title);

  return (
    <div className="tabs-wrapper">
      <div className="tabs-header">
        <div className="tabs">
          {tabs.map((t, index) => (
            <div className={"tab-title"} key={index}>
              <button
                className={
                  selectedTab === t.title ? "active-button" : "tab-button"
                }
                onClick={() => {
                  setTab(t.title);
                }}
              >
                {t.title}
              </button>
              <div
                className={
                  selectedTab === t.title ? "active-divider" : "divider"
                }
              />
            </div>
          ))}
        </div>
        <div className="header-divider" />
      </div>
      <div className="tab-content">
        {tabs.map((t, index) => {
          const SelectedScreen = t.screen;
          return selectedTab === t.title ? (
            <SelectedScreen key={index} params={params} title={t.title} />
          ) : null;
        })}
      </div>
    </div>
  );
};

export default withRouter(Tabs);
