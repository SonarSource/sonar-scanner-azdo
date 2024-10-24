import { ProjectStatus } from "../sonarqube/types";
import { formatMeasure } from "./measures";

export const htmlDiv = (style: string, content?: string) =>
  `<div style="${style ?? ""}">${(content ?? "").trim()}</div>`;

export const htmlSeparator = () =>
  htmlDiv(
    `background: #EBECF0;
    height: 1px;
    margin: 16px 0px;`,
  );

export const htmlLink = (style: string, href: string, content: string) =>
  `
  <a
    style="
      color: rgb(9, 105, 218);
      text-decoration: none;
      border-bottom: 1px solid rgb(9, 105, 218);
      font-weight: 500;
      width: fit-content; ${style ?? ""}
    "
    href="${href}"
  >${content.trim()}</a>
  `.trim();

export const htmlMainDiv = (content: string) =>
  htmlDiv(
    `font-family: Inter;
    font-size: 14px;
    font-style: normal;
    line-height: normal;
    font-weight: 400;
    padding-bottom: 1px;`,
    content,
  );

export const htmlSectionDiv = (title: string, content: string) =>
  htmlDiv(`margin-top: 24px;`, htmlDiv(`margin-bottom: 12px;`, title) + content.trim());

export const htmlMetricList = (items: string[]) =>
  `
  <ul
    style="
      padding: 0;
      margin: 0;
    "
  >${items.map((item) => item.trim()).join("")}</ul>
  `.trim();

export const htmlMetricListItem = (icon: string, text: string, requiredContent?: string) => {
  const els = [
    `<span style="width: 24px">${icon}</span>`,
    `<span style="margin-left: 4px">${text}</span>`,
    requiredContent ? `<span class="margin-left: 12px">(required ${requiredContent})</span>` : "",
  ];
  return `
    <li
      style="
        list-style: none;
        align-items: center;
        margin-top: 8px;
      "
    >${els.join("\n")}</li>
  `.trim();
};

export const htmlQualityGateHeader = (projectStatus: ProjectStatus, projectName?: string) => {
  let qgTitle: string;
  if (projectStatus.status !== "none") {
    qgTitle = `Quality Gate ${formatMeasure(projectStatus.status, "LEVEL")}`;
  } else {
    qgTitle = "No Quality Gate Status";
  }
  qgTitle += projectName ? ` (${projectName})` : "";
  return htmlDiv(
    `font-size: 21px;
    font-weight: 600;`,
    [
      `<span>${formatMeasure(projectStatus.status, "LEVEL_ICON")}</span>`,
      `<span style="
        height: 100%;
        padding-top: 4px;
        margin-left: 4px;
      ">${qgTitle}</span>`,
    ].join(""),
  );
};
