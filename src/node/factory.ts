// 统一出口：算法层任何原子操作（包括创建对象）都从此处通知可视化层
type OpHook = (target: object, method: string, args: any[]) => void;

let opHook: OpHook | null = null;

/** 由可视化层注册（页面初始化时调用一次） */
export function setOpHook(h: OpHook | null): void {
    opHook = h;
}

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
            if (!(typeof prop === "string") || !prop.startsWith("_") ||
                typeof value !== "function") {
                return value;
            }
            // 原子操作：包装动画逻辑
            // 注意：必须以 proxy（而不是原始对象）作为 this 调用原子方法。
            // 算法层会在原子方法内部直接写入节点字段（例如旋转中的 y.left = this），
            // 若 this 是原始对象，写回链表/树的就是未被代理的对象；此后对它调用原子操作
            // 不会再经过代理、不会触发 opHook，可视化层就会漏掉这些变化。
            return (...a: any[]) => {
                const result = (value as (...rest: any[]) => any).apply(proxy, a);
                opHook?.(proxy as unknown as object, prop, a);
                return result;
            };
        },
        set(t, prop, value) {
            // 原子方法内部对字段的赋值统一落到原始对象上
            Reflect.set(t, prop, value);
            return true;
        },
    });

    // 创建也走同一个出口
    opHook?.(proxy as unknown as object, "_create", args);
    return proxy;
}