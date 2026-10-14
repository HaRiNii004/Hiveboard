import api from './axiosClient';

// Cards with a due date from every board I'm on, due between from and to
// (inclusive, "yyyy-MM-dd"). At most 100 days per request.
export const getCalendarCards = (from, to) => {
  return api.get('/calendar', { params: { from, to } });
};
