type StateProps = Array<string>;

export const initialState: StateProps = [];

export default (state: StateProps = initialState, action: Object) => {
    const {type} = action;
    const actionType = type.replace(/_(REQUEST|SUCCESS|ERROR)/, '');
    const set = new Set(state);
    if (type.includes('REQUEST')) {
        set.add(actionType);
        return [...set];
    }
    if (type.match(/_(SUCCESS|ERROR)/)) {
        set.delete(actionType);
        return [...set];
    }
    return state;
};
