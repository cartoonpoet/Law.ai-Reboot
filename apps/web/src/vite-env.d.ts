/// <reference types="vite/client" />

// 빌드 식별자(vite.config.ts 의 define 으로 주입). useVersionCheck 가 /version.json 과 비교.
declare const __BUILD_ID__: string;
