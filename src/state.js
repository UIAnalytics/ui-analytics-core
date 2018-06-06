const defaultState = ()=>{
  return JSON.parse(JSON.stringify({
    integrations: [],
    plugins: [],
    tracks: [],
    transforms: [],
    user: null
  }));
};

let globalState = defaultState();

export function set(newState) {
  globalState = Object.assign({}, globalState, newState);
}

export function get() {
  return globalState;
}

export function clear() {
  globalState = defaultState()
}
