import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

registerLocaleData(localeIt);

bootstrapApplication(App, appConfig).catch((error) => console.error(error));
