const elementPlusConfigMap = {}
/**
 * 将./slots中的文件挂载到对象slotFunctions上
 * 文件名为key，对应JSON配置中的__config__.tag
 * 文件内容为value，解析JSON配置中的__slot__
 */

import slotRenderFunctions from "@/components/FixedItem/slots";
const jsonFiles = import.meta.glob("./components/*.json", {query: "?json", import: 'default', eager: true});
const keys = Object.keys(jsonFiles) || []
keys.map(key => {
    const id = key.replace(/^\.\/(.*)\.\w+$/, '$1').split("/").pop();
    const json=jsonFiles[key];
    if(!json.directive) {
        if (!json.attributes) {
            json.attributes = []
        }
        if (!json.slots) {
            json.slots = []
        }
        if (!json.layouts) {
            json.layouts = ["rawItem"];
        }
        if (slotRenderFunctions[json.tag]) {
            json.layouts.splice(0, 0, "fixedItem")
        }
    }
    elementPlusConfigMap[id] = json;
    if(id==='input'){
        elementPlusConfigMap["password"] = json;
        elementPlusConfigMap["textarea"] = json;
    }
})
Object.assign( elementPlusConfigMap["tree-select"].attributes,elementPlusConfigMap["select"].attributes);
Object.assign( elementPlusConfigMap["tree-select"].attributes,elementPlusConfigMap["tree"].attributes);
Object.assign( elementPlusConfigMap["mention"].attributes,elementPlusConfigMap["input"].attributes);
Object.assign( elementPlusConfigMap["mention"].slots,elementPlusConfigMap["input"].slots);
//fixme tree-select data中的value
export default elementPlusConfigMap;
