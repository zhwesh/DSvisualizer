import { DataNode } from "./DataNode";

// 统一出口：算法层任何原子操作（含创建）都从这里通知可视化层
type OpHook = (node: DataNode, method: string, args: any[]) => void;

let opHook: OpHook | null = null;

/** 由可视化层注册（页面初始化时调一次） */
export function setOpHook(h: OpHook | null): void {
    opHook = h;
}

// 约定：下划线开头即原子操作（单一真相源就在这儿）
const isAtomic = (p: string | symbol): p is string =>
    typeof p === "string" && p.startsWith("_");

/**
 * 通用工厂：创建实例并加装代理
 * 约定：该实例所有以下划线开头的方法皆为原子操作，所有原子操作的调用都会触发opHook
 */
export function create<T extends new (...args: any[]) => any>(
    targetClass: T,
    ...args: ConstructorParameters<T>
): InstanceType<T> {
    const target = new targetClass(...args);

    const proxy = new Proxy(target, {
        get(t, prop, receiver) {
            const value = Reflect.get(t, prop, receiver);
            // 非原子操作或非函数：原样返回
            if (!isAtomic(prop) || typeof value !== "function") {
                return value;
            }
            // 原子操作：包装动画逻辑
            return (...a: any[]) => {
                const result = (value as Function).apply(t, a);
                opHook?.(proxy as unknown as DataNode, prop, a);
                return result;
            };
        },
    });

    // 创建也走同一个出口
    opHook?.(proxy as unknown as DataNode, "_create", args);
    return proxy;
}