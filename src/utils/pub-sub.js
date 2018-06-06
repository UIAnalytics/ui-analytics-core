
const subscriptions = {};

const subscribe = (topic, cb)=>{
  const topicSubs = subscriptions[topic];
  if(topicSubs && topicSubs.invokeImmediately){

    // TODO: this should be ran async to match the
    // control flow as if invokeImmediately wasn't set
    invokeTopicCb(topic, cb);

  }else if(topicSubs){
    topicSubs.push(cb);
  }else {
    subscriptions[topic] = [cb];
  }
  return { _subscriptionCb: cb };
};

const unsubscribe = (topic, subscribeReference)=>{
  if(!topic || !subscribeReference || !subscribeReference._subscriptionCb){
    // nothing to unsubscribe from
    return;
  }

  const topicSubs = subscriptions[topic];
  if(topicSubs){
    // only remove one reference at a time.
    let filteredOneReference;
    subscriptions[topic] = topicSubs.filter((subCb) =>{
      if (!filteredOneReference && subCb === subscribeReference._subscriptionCb) {
        filteredOneReference = true;
        return false;
      }
      return true;
    });
  }
};

const publish = (topic, data, options={})=>{

  if(!topic){
    return;
  }

  const topicSubs = subscriptions[topic];

  if(Array.isArray(topicSubs)){
    topicSubs.forEach(cb=>invokeTopicCb(topic, cb, data))
  }

  // add the flag that will make the subsequent
  if(options.invokeNewSubs){
    subscriptions[topic] = topicSubs ? subscriptions[topic] : [];
    subscriptions[topic].invokeImmediately = true;

    // NOTE: evaluating need. Leaving out to reduce potential of memory leaking
    // for long living data storing
    // subscriptions[topic].invokeData = data;
  }
}

const invokeTopicCb = (topic, cb, data)=>{
  cb(data);
};

const scopedPubSub = (topicScope)=>{
  return {
    publish: (topic, data, options={})=>{
      return publish(`${topicScope}-${topic}`, data, options);
    },
    subscribe: (topic, cb)=>{
      return subscribe(`${topicScope}-${topic}`, cb);
    },
    unsubscribe: (topic, subscribeReference)=>{
      return unsubscribe(`${topicScope}-${topic}`, subscribeReference);
    }
  }
};

export { scopedPubSub };
