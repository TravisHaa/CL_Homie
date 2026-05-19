import * as admin from 'firebase-admin';

admin.initializeApp();

export { exchangeGoogleAuthCode, unlinkGoogleCalendar } from './google-oauth';
