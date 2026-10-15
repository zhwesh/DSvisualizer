/// <reference types="node" />
import { create, setOpHook } from "../../node/factory";
import { AVLTree } from "../../datastucture/Tree/BinarySearchTree/AVLTree";
import { SegmentTree } from "../../datastucture/Tree/SegmentTree/SegmentTree";
import { StepController, StepStatus } from "../../controller/StepController";
import * as fs from "node:fs";

const sc = StepController.getStepController();
sc.setStatus(StepStatus.PLAYING);
sc.setTimeInterval(0);

const events: string[] = [];
setOpHook((obj, method, args) => {
    const cls = (obj as any).constructor?.name ?? '?';
    events.push(`${cls}.${method}(${(args ?? []).map((a: any) => (a && typeof a === 'object' && 'val' in a) ? a.val : (typeof a === 'number' ? a : JSON.stringify(a)?.slice(0, 20))).join(',')})`);
});

function dump(tag: string): void {
    fs.appendFileSync("C:/Users/17096/Desktop/DSvisualizer-master/optrace.log", "\n===== " + tag + " =====\n" + events.join("\n") + "\n");
}

async function main(): Promise<void> {
    events.length = 0;
    const avl = create(AVLTree);
    await avl.insert(10);
    await avl.insert(5);
    await avl.insert(15);
    await avl.insert(3);
    dump("AVL insert (root=" + avl.getRootNode()?.val + ")");

    events.length = 0;
    const avl2 = create(AVLTree);
    await avl2.insert(10);
    await avl2.insert(20);
    await avl2.insert(30);
    dump("AVL rotate LL (root=" + avl2.getRootNode()?.val + ")");
    const r = avl2.getRootNode();
    fs.appendFileSync("C:/Users/17096/Desktop/DSvisualizer-master/optrace.log",
        "root=" + r?.val + " root.left=" + r?.left?.val + " root.right=" + r?.right?.val +
        " | root.left.left=" + r?.left?.left?.val + " root.right.left=" + r?.right?.left?.val +
        " | root.left.right=" + r?.left?.right?.val + " root.right.right=" + r?.right?.right?.val + "\n");
    // 也检查代理节点读到的结构
    const n10 = (avl2 as any).getRootNode();
    fs.appendFileSync("C:/Users/17096/Desktop/DSvisualizer-master/optrace.log",
        "proxy-root=" + n10?.val + " proxy-root.left=" + n10?.left?.val + " proxy-root.right=" + n10?.right?.val + "\n");

    events.length = 0;
    const seg = create(SegmentTree, [1, 2, 3, 4, 5, 6, 7, 8]);
    dump("SegmentTree build total=" + events.length);
    const root = seg.getRootNode();
    fs.appendFileSync("C:/Users/17096/Desktop/DSvisualizer-master/optrace.log", "seg root sum=" + root?.sum + " left=" + root?.left?.sum + " right=" + root?.right?.sum + "\n");
}
main().catch(e => { fs.appendFileSync("C:/Users/17096/Desktop/DSvisualizer-master/optrace.log", "ERR: " + String(e) + "\n"); process.exit(1); });

