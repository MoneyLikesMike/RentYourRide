import {createSelector} from 'reselect';

const selectAuthReducer = (state: Object) => state && state.auth;


const selectRefreshToken = createSelector(
    selectAuthReducer,
    reducer => reducer && reducer.token && reducer.token.refreshToken,
);

export {
    selectRefreshToken,
};

