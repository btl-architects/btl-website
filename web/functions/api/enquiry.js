import { handleEnquiry } from '../../server/enquiry.js';
export const onRequest = ({ request, env }) => handleEnquiry(request, env);
