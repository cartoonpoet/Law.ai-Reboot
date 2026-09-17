import DOMPurify from "dompurify";

// 자문 요청 에디터(tiptap)가 만드는 태그만 남긴다. 글자색·정렬은 style 속성으로 온다.
const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "blockquote", "span", "mark", "h1", "h2", "h3", "h4", "code", "pre"];
const ALLOWED_ATTR = ["href", "rel", "target", "style"];

/** 요청자가 쓴 에디터 HTML 을 화면에 넣기 전에 정화한다. */
export const sanitizeAdviceHtml = (html: string): string => DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
