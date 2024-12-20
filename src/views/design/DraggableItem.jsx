import FixedItem from "@/components/FixedItem"
import Draggable from '@/vuedraggable/vuedraggable';
import {deepClone} from "@/utils";
import '@/styles/draggalbeItem.scss'
import {AutoCompleteCallback} from "@/utils/element-plus-utils";
import {resolveDirective, withDirectives} from "vue";
import {replaceTemplate} from "@/utils/share";

let eventTime = Date.now();

export default {
    props: [
        'currentItem',
        'activeId',
        'designConf',
        'onActiveItem',
        'onChange',
        'itemMove',
        'formModelsAndRules',
        'dynamicData'
    ],
    setup(props) {
        function buildEvent(curItem) {
            const onClick = (event) => {
                //fixme 再针对menu写一些代码  {//阻止事件向上传递（因无法选中el-menu-item而更改）
                if (Date.now() - eventTime > 50) {
                    props.onActiveItem(curItem)
                }
                if (curItem.__id__ === 'menu-item') {
                    eventTime = Date.now();
                }
                if (!curItem.__props__.onclick && event instanceof PointerEvent) {//如果本组件自带点击事件，则要运行
                    event.stopPropagation()
                }
            }

            return {onClick}
        }

        function buildProps(curItem, {isBuildClass, isBuildEvent, isBuildModel}) {
            const newProps = {};
            Object.assign(newProps, curItem.__native__);
            Object.assign(newProps, curItem.__props__);
            if (curItem.__id__ === "autocomplete") {
                const ac = new AutoCompleteCallback(curItem.__data__.static.options);
                newProps["fetch-suggestions"] = ac.querySearch;
            }
            if(param) {
                for (const key in newProps) {
                    let value = newProps[key];
                    if(typeof value === 'string') {
                        newProps[key] = replaceTemplate(value,param);
                    }
                }
            }
            //对style进行复制
            if (newProps.style) {
                newProps.style = deepClone(newProps.style);
            }
            if (isBuildClass) {
                Object.assign(newProps, buildClass(curItem, newProps.class))
            }
            if (isBuildEvent) {
                Object.assign(newProps, buildEvent(curItem))
            }
            if (isBuildModel && curItem.__vModel__) {
                Object.assign(newProps, buildVModel(curItem));
            }
            return newProps;
        }


        function buildClass(curItem, oldClass) {
            const {drawItemId} = curItem.__config__
            let clazz = props.activeId === drawItemId ? 'drawing-ele selected-draw-ele' : 'drawing-ele';
            if (props.designConf.unFocusedComponentBorder && props.activeId !== drawItemId) clazz += ' unselected-draw-ele'
            if (oldClass) {
                if (Array.isArray(oldClass)) {
                    clazz += " " + oldClass.join(" ")
                } else {
                    clazz += " " + oldClass
                }
            }
            if (clazz) {
                return {class: clazz};
            } else {
                return {};
            }

        }

        function buildVModel(curItem) {
            if (curItem.__vModel__) {
                return {
                    modelValue: curItem.__config__.defaultValue,
                    'onUpdate:modelValue'(e) {
                        curItem.__config__.defaultValue = e
                    }
                }
            } else {
                return {}
            }
        }

        function formItem(curItem, layout) {
            //使用函数，才能响应式
            const formItemProps = () => {
                const {required, showLabel} = curItem.__config__
                let {label, labelWidth} = curItem.__config__
                if (showLabel === false) {
                    labelWidth = undefined;
                    label = undefined
                } else {
                    labelWidth = labelWidth ? labelWidth + "px" : null
                }
                return {
                    labelWidth,
                    label,
                    required,
                    prop: curItem.__vModel__,
                    ...buildClass(curItem),
                    style: {width: '100%'}
                }
            }
            let input;
            if (layout === 'rawItem') {
                input = rawItem(curItem, true)

            } else if (layout === 'fixedItem') {
                input = fixedItem(curItem, true);
            } else {
                input = "error layout!";
            }
            return h(resolveComponent("el-form-item"), {...formItemProps(), ...buildEvent(curItem)}, () => input);
        }

        function containerItem(curItem) {
            let containerProps = (curItem) => {
                const props_ = buildProps(curItem, {isBuildClass: true, isBuildModel: true})
                if (curItem.__slots__.default.length === 0) {
                    if (!props_.style.minHeight && !props_.style['min-height']) {
                        props_.style['min-height'] = '60px';
                        props_.style['min-width'] = '120px';
                    }
                }
                return props_;
            }
            let model = undefined
            let rules = undefined
            if (props.formModelsAndRules && curItem.__config__.tag === 'el-form') {
                model = props.formModelsAndRules[curItem.__props__.model];
                rules = props.formModelsAndRules[curItem.__props__.rules];
            }
            const slotsWithoutDefault = buildSlots(curItem);
            delete slotsWithoutDefault.default;//因为由Draggable生成，所以删除default
            let DraggableChildren = <Draggable tag={curItem.__config__.tag}
                                               componentData={{
                                                   ...containerProps(curItem),
                                                   model,
                                                   rules
                                               }}
                                               componentSlots={slotsWithoutDefault}
                                               list={curItem.__slots__.default} group="componentsGroup"
                                               itemKey="renderKey"
                                               onChange={props.onChange}
                                               move={props.itemMove}
                                               animation={340}>
                {{
                    item: ({element}) => h(doLayout(element)),
                }}
            </Draggable>
            return <DraggableChildren {...buildEvent(curItem)}/>

        }

        let param

        function buildSlots(curItem) {
            let thisSlots = {}
            for (const key in curItem.__slots__) {
                if (typeof curItem.__slots__[key] === 'string') {

                    thisSlots[key] = () => replaceTemplate(curItem.__slots__[key], param);


                    continue;
                }
                if (typeof curItem.__slots__[key] === 'function') {
                    thisSlots[key] = curItem.__slots__[key];
                    continue;
                }
                if (curItem.__slots__[key].length === 0) {
                    continue;
                }
                if (curItem.__config__.layout === 'rawItem') {
                    const {paramSlots} = curItem.__config__;
                    let getParam = paramSlots && paramSlots.indexOf(key) >= 0;
                    thisSlots[key] = (p) => {
                        if (getParam) {
                            param = p
                            //  console.info(p)
                        }
                        return curItem.__slots__[key].map(element => doLayout(element))
                    };
                } else {
                    thisSlots[key] = () =>
                        <Draggable tag="span"
                                   list={curItem.__slots__[key]} group="componentsGroup"
                                   itemKey="renderKey"
                        >
                            {{
                                item: ({element}) => h(doLayout(element)),
                            }}
                        </Draggable>
                }

            }
            return thisSlots;
        }


        function buildData(curItem) {
            const data = curItem.__data__;
            let dataProps = {}
            if (data) {
                const {name, source, inProps} = data;
                if (source === 'static') {
                    dataProps[name] = data.static[name];
                } else {
                    const key = curItem.__refs__[name];
                    if (data.dynamic.dataKey) {
                        dataProps[name] = props.dynamicData[key] && props.dynamicData[key][data.dynamic.dataKey] || [];//[]硬编码
                    } else {
                        dataProps[name] = props.dynamicData[key] || [];//[]硬编码
                    }
                }
                if (inProps) {
                    return dataProps;
                } else {
                    return {__data__: dataProps};
                }
            } else {
                return {}
            }


        }

        function fixedItem(curItem, simple) {
            const {wrapWithSpan} = curItem.__config__;
            let config = {...curItem, ...buildData(curItem)};


            if (simple) {
                return <FixedItem conf={config} {...buildVModel(curItem)}></FixedItem>
            } else {
                if (wrapWithSpan) {
                    const source = <FixedItem conf={config}  {...buildVModel(curItem)}></FixedItem>
                    return doWrapWithSpan(curItem, source);
                } else {
                    return <FixedItem
                        conf={config} {...buildClass(curItem, curItem.__native__.class)} {...buildVModel(curItem)} {...buildEvent(curItem)}></FixedItem>
                }


            }


        }

        /**
         *
         * @param curItem
         * @param simple true:不生成class和event
         * @return {VNode}
         */
        function rawItem(curItem, simple) {
            const {tag, wrapWithSpan} = curItem.__config__;
            const data = buildData(curItem);
            if (simple) {
                return h(resolveComponent(tag), {
                        ...buildProps(curItem, {
                            isBuildModel: true,
                            isBuildEvent: true
                        }), ...data
                    },
                    buildSlots(curItem));
            } else {
                if (wrapWithSpan) {
                    const source = h(resolveComponent(tag), {
                        ...buildProps(curItem, {
                            isBuildModel: true,
                            isBuildEvent: true
                        }), ...data
                    }, buildSlots(curItem));
                    return doWrapWithSpan(curItem, source);
                } else {
                    return h(resolveComponent(tag),
                        {...buildProps(curItem, {isBuildClass: true, isBuildModel: true, isBuildEvent: true}), ...data},
                        buildSlots(curItem));
                }

            }

        }

        function doWrapWithSpan(curItem, source) {
            const {drawItemId} = curItem.__config__
            let clazz = props.activeId === drawItemId ? 'selected-raw-ele' : props.designConf.unFocusedComponentBorder && props.activeId !== drawItemId ? 'raw-ele' : '';
            return h("span", {class: clazz, ...buildEvent(curItem)}, source);
        }

        function doLayout(curItem) {
            if (typeof curItem === "string") {
                return h("span", replaceTemplate(curItem, param));
            }
            if (typeof curItem === "function") {
                return curItem;
            }
            let ele;
            const {layout, wrapWithFormItem} = curItem.__config__;
            if (wrapWithFormItem) {
                ele = formItem(curItem, layout);
            } else if (layout === 'containerItem') {
                ele = containerItem(curItem);
            } else if (layout === 'rawItem') {
                ele = rawItem(curItem);
            } else if (layout === 'fixedItem') {
                ele = fixedItem(curItem);
            }
            const directives = buildDirectives(curItem);
            if (directives.length > 0) {
                return withDirectives(ele, directives);
            } else {
                return ele;
            }

        }

        function buildDirectives(curItem) {
            const {__directives__} = curItem;
            const directives = [];
            if (__directives__) {
                for (const k in __directives__) {
                    const v = __directives__[k];
                    const modifiers = {};
                    v.modifiers && v.modifiers.forEach(m => {
                        modifiers[m] = true;
                    })
                    directives.push([resolveDirective(k), v.value, v.arg, modifiers]);
                }
            }
            return directives;
        }

        return () => doLayout(props.currentItem);


        // return () => withDirectives(doLayout(props.currentItem), [
        //     [resolveDirective("loading"), true, "", {fullscreen: true, lock: true}]
        // ]);
    }


}

