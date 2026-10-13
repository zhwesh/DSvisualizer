<template>
  <div class="app-container">
    <!-- 左侧边栏：树状菜单 -->
    <aside class="sidebar">
      <!-- 数据结构分类 -->
      <div class="menu-section">
        <div class="menu-section-title">
          <span class="folder-icon">📁</span> 数据结构
        </div>

        <div class="menu-subsection">
          <div class="menu-subsection-title">
            <span class="folder-icon">📂</span> 线性表
          </div>
          <div
            v-for="item in arrayMenu"
            :key="item.key"
            :class="['menu-item', { active: currentMenu === item.key }]"
            @click="selectMenu(item.key)"
          >
            <span class="file-icon">📄</span> {{ item.label }}
          </div>
        </div>

        <div class="menu-subsection">
          <div class="menu-subsection-title">
            <span class="folder-icon">📂</span> 树
          </div>
          <div class="menu-subsection">
            <div class="menu-subsection-title">
              <span class="folder-icon">📂</span> 二叉搜索树
            </div>
            <div
              v-for="item in treeMenu"
              :key="item.key"
              :class="['menu-item', { active: currentMenu === item.key }]"
              @click="selectMenu(item.key)"
            >
              <span class="file-icon">📄</span> {{ item.label }}
            </div>
          </div>
        </div>
      </div>

      <!-- 算法分类 -->
      <div class="menu-section">
        <div class="menu-section-title">
          <span class="folder-icon">📂</span> 算法
        </div>
        <div class="menu-subsection">
          <div class="menu-subsection-title">
            <span class="folder-icon">📂</span> 线性表
          </div>
          <div
            :class="['menu-item', { active: currentMenu === VisualizerType.BINARY_SEARCH }]"
            @click="selectMenu(VisualizerType.BINARY_SEARCH)"
          >
            <span class="file-icon">📄</span> 二分查找
          </div>
        </div>
        <div class="menu-subsection">
          <div class="menu-subsection-title">
            <span class="folder-icon">📂</span> 二叉树
          </div>
          <div
            :class="['menu-item', { active: currentMenu === VisualizerType.BINARY_TREE_TRAVERSAL }]"
            @click="selectMenu(VisualizerType.BINARY_TREE_TRAVERSAL)"
          >
            <span class="file-icon">📄</span> 二叉树的遍历
          </div>
        </div>
      </div>
    </aside>

    <!-- 中间主区域 -->
    <main class="main-area">
      <!-- 顶部标题栏 -->
      <header class="top-header">
        <h1 class="page-title">{{ currentTitle }}</h1>
      </header>

      <!-- 画布区域 -->
      <div class="canvas-container">
        <!-- 左上角统计信息 -->
        <div class="stats-panel">
          <template v-if="currentMenu === VisualizerType.BINARY_SEARCH">
            <div class="stat-line">left&nbsp;&nbsp;: {{ bsVars.left }}</div>
            <div class="stat-line">right : {{ bsVars.right }}</div>
            <div class="stat-line">mid&nbsp;&nbsp;&nbsp;: {{ bsVars.mid }}</div>
            <div class="stat-line">target: {{ inputVal }}</div>
          </template>
          <template v-else>
            <div class="stat-line">节点数量: {{ stats.size }}</div>
            <div class="stat-line">当前操作: {{ currentOp }}</div>
          </template>
        </div>

        <!-- 右上角流程控制按钮 -->
        <div class="step-controls">
          <button class="control-btn" @click="handlePlay" title="播放">▶</button>
          <button class="control-btn" @click="handleFastForward" title="快进">⏩</button>
          <button class="control-btn" @click="handlePause" title="暂停">⏸</button>
          <button class="control-btn" @click="handleStep" title="单步执行">➜</button>
        </div>

        <!-- SVG画布 -->
        <svg ref="svgContainer" class="canvas-svg"></svg>
      </div>

      <!-- 底部消息提示区 -->
      <div class="message-panel">
        <div class="message-header">
          <span class="info-icon">ⓘ</span> 提示信息
        </div>
        <div class="message-body">
          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            :class="['message-item', getMessageClass(msg.type)]"
          >
            <span class="msg-icon">{{ getMessageIcon(msg.type) }}</span>
            {{ msg.text }}
          </div>
        </div>
      </div>
    </main>

    <!-- 右侧操作台 -->
    <aside class="control-panel">
      <h2 class="panel-title">操作台</h2>

      <template v-if="currentMenu === VisualizerType.BINARY_SEARCH">
        <div class="control-group">
          <input v-model.number="inputVal" type="number" class="input-field" placeholder="target" />
        </div>
        <button class="action-btn" @click="handleGet">
          <span class="btn-icon">🔍</span> 查找数据
        </button>
        <button class="action-btn" @click="handleClear">
          <span class="btn-icon">🔄</span> 重新开始
        </button>
        <button class="action-btn" @click="handleSetData">
          <span class="btn-icon">⚙️</span> 设置数据并重新开始
        </button>
      </template>

      <template v-else-if="currentMenu === VisualizerType.BINARY_TREE_TRAVERSAL">
        <button class="action-btn" @click="handlePreOrder">
          <span class="btn-icon">🔀</span> 前序遍历
        </button>
        <button class="action-btn" @click="handleInOrder">
          <span class="btn-icon">🔀</span> 中序遍历
        </button>
        <button class="action-btn" @click="handlePostOrder">
          <span class="btn-icon">🔀</span> 后序遍历
        </button>
        <button class="action-btn" @click="handleClear">
          <span class="btn-icon">🔄</span> 重新开始
        </button>
      </template>

      <template v-else>
        <div v-if="!isTreeDS && currentMenu === VisualizerType.ARRAY_LIST" class="control-group">
          <input v-model.number="inputIdx" type="number" class="input-field" placeholder="索引" />
        </div>

        <div class="control-group">
          <input v-model.number="inputVal" type="number" class="input-field" placeholder="数值" />
        </div>

        <button class="action-btn" @click="handleInsert">
          <span class="btn-icon">➕</span> 插入数据
        </button>
        <button v-if="isTreeDS || currentMenu === VisualizerType.ARRAY_LIST" class="action-btn" @click="handleGet">
          <span class="btn-icon">🔍</span> 查找数据
        </button>
        <button v-if="currentMenu === VisualizerType.ARRAY_LIST" class="action-btn" @click="handleSet">
          <span class="btn-icon">✏️</span> 修改数据
        </button>
        <button v-if="isTreeDS || currentMenu === VisualizerType.ARRAY_LIST" class="action-btn" @click="handleDelete">
          <span class="btn-icon">➖</span> 删除数据
        </button>
        <button class="action-btn" @click="handleClear">
          <span class="btn-icon">❓</span> 其他接口
        </button>
      </template>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { VisualizerManager, VisualizerType } from './visualizer/VisualizerManager';
import { StepController, StepStatus, PLAY_TIME_INTERVAL, FAST_TIME_INTERVAL } from './controller/StepController';
import { MessageController, MessageType } from './controller/MessageController';
import { DataNode } from './node/DataNode';
import { create } from './node/factory';
import { ArrayList } from './datastucture/List/ArrayList';
import { BinarySearchTree } from './datastucture/Tree/BinarySearchTree/BinarySearchTree';
import { AVLTree } from './datastucture/Tree/BinarySearchTree/AVLTree';
import { RedBlackTree } from './datastucture/Tree/BinarySearchTree/RedBlackTree';
import { LinkedList as SinglyLinkedList } from './datastucture/List/SinglyLinkedList';
import { CircularLinkedList } from './datastucture/List/CircularLinkedList';
import { DoubleLinkedList } from './datastucture/List/DoubleLinkedList';
import { BinarySearch } from './algorithm/List/BinarySearch';
import { BinaryTreeTraversal } from './algorithm/Tree/BinaryTreeTraversal';
import { BinaryTreeTraversalNode } from './node/BinaryTreeNode/impl/BinaryTreeTraversalNode';

// ========== 菜单数据 ==========
const arrayMenu = [
  { key: VisualizerType.ARRAY_LIST, label: '数组' },
  { key: VisualizerType.SINGLY_LINKED_LIST, label: '单链表' },
  { key: VisualizerType.CIRCULAR_LINKED_LIST, label: '循环链表' },
  { key: VisualizerType.DOUBLE_LINKED_LIST, label: '双向链表' },
];

const treeMenu = [
  { key: VisualizerType.BST, label: '二叉搜索树' },
  { key: VisualizerType.AVL, label: 'AVL树' },
  { key: VisualizerType.RED_BLACK, label: '红黑树' },
];

const currentMenu = ref<VisualizerType>(VisualizerType.BST);

const currentTitle = computed(() => {
  if (currentMenu.value === VisualizerType.BINARY_SEARCH) return '二分查找';
  if (currentMenu.value === VisualizerType.BINARY_TREE_TRAVERSAL) return '二叉树的遍历';
  const all = [...arrayMenu, ...treeMenu];
  return all.find(m => m.key === currentMenu.value)?.label || '';
});

// ========== 画布引用 ==========
const svgContainer = ref<SVGSVGElement | null>(null);

// ========== 当前数据结构实例 ==========
let currentDS: any = null;

// ========== 状态数据 ==========
const stats = ref({
  size: 0,
  capacity: 0,
});

// 当前操作（画布左上角显示）
const currentOp = ref('空闲');

// 二分查找变量显示
const bsVars = ref({
  left: 0,
  right: 9,
  mid: 4,
});

const messages = ref<{ text: string; type: number }[]>([]);

// ========== 输入框 ==========
const inputIdx = ref<number>(0);
const inputVal = ref<number>(10);

// ========== 控制器实例 ==========
const stepController = StepController.getStepController();
const messageController = MessageController.getMessageController();
const visualizerManager = VisualizerManager.getInstance();

// ========== 判断当前是否为树结构 ==========
const isTreeDS = computed(() => {
  const treeTypes: VisualizerType[] = [VisualizerType.BST, VisualizerType.AVL, VisualizerType.RED_BLACK];
  return treeTypes.includes(currentMenu.value);
});

// 是否为链表结构（添加数据不需要索引，自动追加到末尾）
const isLinkedList = computed(() =>
  currentMenu.value === VisualizerType.SINGLY_LINKED_LIST ||
  currentMenu.value === VisualizerType.CIRCULAR_LINKED_LIST ||
  currentMenu.value === VisualizerType.DOUBLE_LINKED_LIST
);

// ========== 构建示例二叉树（遍历算法使用） ==========
function buildSampleTraversalTree(): BinaryTreeTraversalNode {
  const n3 = create(BinaryTreeTraversalNode, null, null, 3);
  const n7 = create(BinaryTreeTraversalNode, null, null, 7);
  const n5 = create(BinaryTreeTraversalNode, null, null, 5);
  const n13 = create(BinaryTreeTraversalNode, null, null, 13);
  const n18 = create(BinaryTreeTraversalNode, null, null, 18);
  const n15 = create(BinaryTreeTraversalNode, null, null, 15);
  const n10 = create(BinaryTreeTraversalNode, null, null, 10);
  n5._set_left(n3);
  n5._set_right(n7);
  n15._set_left(n13);
  n15._set_right(n18);
  n10._set_left(n5);
  n10._set_right(n15);
  return n10;
}

// ========== 菜单切换 ==========
const selectMenu = (key: VisualizerType) => {
  // 中止上一个数据结构可能挂起的复合操作，避免旧操作污染新视图
  stepController.abort();
  currentMenu.value = key;
  currentOp.value = '空闲';
  DataNode.restart();
  visualizerManager.switchVisualizer(key);

  switch (key) {
    case VisualizerType.ARRAY_LIST:
      currentDS = create(ArrayList);
      break;
    case VisualizerType.SINGLY_LINKED_LIST:
      currentDS = create(SinglyLinkedList);
      break;
    case VisualizerType.CIRCULAR_LINKED_LIST:
      currentDS = create(CircularLinkedList);
      break;
    case VisualizerType.DOUBLE_LINKED_LIST:
      currentDS = create(DoubleLinkedList);
      break;
    case VisualizerType.BST:
      currentDS = create(BinarySearchTree);
      break;
    case VisualizerType.AVL:
      currentDS = create(AVLTree);
      break;
    case VisualizerType.RED_BLACK:
      currentDS = create(RedBlackTree);
      break;
    case VisualizerType.BINARY_SEARCH:
      // 二分查找：初始化已排序数组 1-10
      currentDS = create(BinarySearch, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      break;
    case VisualizerType.BINARY_TREE_TRAVERSAL:
      currentDS = create(BinaryTreeTraversal, buildSampleTraversalTree());
      break;
    default:
      currentDS = create(ArrayList);
  }

  updateStats();
  addMessage(`已切换到 ${currentTitle.value}`, MessageType.INFO);
};

// ========== 更新统计信息 ==========
const updateStats = () => {
  if (currentDS) {
    try {
      stats.value.size = currentDS.size() || 0;
      stats.value.capacity = currentDS.capacity?.() || currentDS.size() || 0;
    } catch (e) {
      stats.value.size = 0;
      stats.value.capacity = 0;
    }
  }
};

// ========== 流程控制按钮 ==========
const handlePlay = () => {
  stepController.setTimeInterval(PLAY_TIME_INTERVAL);
  stepController.setStatus(StepStatus.PLAYING);
  addMessage('开始播放', MessageType.INFO);
};

const handleFastForward = () => {
  stepController.setTimeInterval(FAST_TIME_INTERVAL);
  stepController.setStatus(StepStatus.PLAYING);
  addMessage('快进模式', MessageType.INFO);
};

const handlePause = () => {
  stepController.setStatus(StepStatus.PAUSE_OR_FREE);
  addMessage('已暂停', MessageType.INFO);
};

const handleStep = () => {
  stepController.setStatus(StepStatus.STEP_EXECUTION);
};

// ========== 操作按钮 ==========
// 操作串行化：连续点击操作按钮时排队执行（前一个完成后自动快进执行下一个），
// 避免多个操作并发修改同一数据结构导致节点丢失
let opChain: Promise<void> = Promise.resolve();
let opBusy = false;
const runOp = (op: () => Promise<void>): void => {
  const queued = opBusy;   // 点击时前一个操作尚未结束 → 排队并自动快进
  opBusy = true;
  opChain = opChain.then(async () => {
    stepController.begin();
    if (queued) {
      // 有排队操作：自动快进执行，保证连续点击也能全部完整执行
      stepController.setTimeInterval(FAST_TIME_INTERVAL);
      stepController.setStatus(StepStatus.PLAYING);
    }
    await op();
  }).finally(() => {
    opBusy = false;
  });
};

const handleInsert = () => {
  if (!currentDS) return;
  // 点击时快照输入值，避免排队执行时输入框已被改为后续操作的值
  const insertVal = inputVal.value;
  const insertIdx = inputIdx.value;
  const tree = isTreeDS.value;
  const linked = isLinkedList.value;
  runOp(async () => {
    currentOp.value = '插入数据';
    try {
      if (tree) {
        addMessage(`将节点${insertVal}作为新节点加入${currentTitle.value}`, MessageType.INFO);
        await currentDS.insert(insertVal);
      } else if (linked) {
        // 链表添加不需要索引：自动追加到末尾
        addMessage(`执行插入: val=${insertVal}（追加到链表末尾）`, MessageType.INFO);
        await currentDS.insert(currentDS.size(), insertVal);
      } else {
        addMessage(`执行插入: idx=${insertIdx}, val=${insertVal}`, MessageType.INFO);
        await currentDS.insert(insertIdx, insertVal);
      }
    } catch (e) {
      addMessage(isCancelError(e) ? '插入操作已取消' : '插入操作执行完毕', MessageType.SUCCESS);
    }
    updateStats();
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
  });
};

const handleDelete = () => {
  if (!currentDS) return;
  const delVal = inputVal.value;
  const delIdx = inputIdx.value;
  const tree = isTreeDS.value;
  runOp(async () => {
    currentOp.value = '删除数据';
    try {
      if (tree) {
        addMessage(`执行删除: val=${delVal}`, MessageType.INFO);
        await currentDS.delete(delVal);
      } else {
        addMessage(`执行删除: idx=${delIdx}`, MessageType.INFO);
        await currentDS.delete(delIdx);
      }
    } catch (e) {
      addMessage(isCancelError(e) ? '删除操作已取消' : '删除操作执行完毕', MessageType.SUCCESS);
    }
    updateStats();
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
  });
};

const handleGet = () => {
  if (!currentDS) return;
  const getVal = inputVal.value;
  const getIdx = inputIdx.value;
  const menu = currentMenu.value;
  const tree = isTreeDS.value;
  runOp(async () => {
    currentOp.value = '查找数据';
    try {
      if (menu === VisualizerType.BINARY_SEARCH) {
        addMessage(`开始查找 target=${getVal}`, MessageType.INFO);
        const result = await currentDS.find(getVal);
        addMessage(`查找结果: 小于等于 ${getVal} 的最后一个元素索引 = ${result}`, MessageType.SUCCESS);
      } else if (tree) {
        addMessage(`执行查找: val=${getVal}`, MessageType.INFO);
        const result = await currentDS.contains(getVal);
        addMessage(`查找结果: 值 ${getVal} ${result ? '存在' : '不存在'}`, MessageType.SUCCESS);
      } else {
        addMessage(`执行查找: idx=${getIdx}`, MessageType.INFO);
        const result = await currentDS.get(getIdx);
        if (result !== null && result !== undefined) {
          addMessage(`查找结果: 索引 ${getIdx} 处的值 = ${result}`, MessageType.SUCCESS);
        }
      }
    } catch (e) {
      addMessage(isCancelError(e) ? '查找操作已取消' : '查找操作执行完毕', MessageType.SUCCESS);
    }
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
  });
};

const handleSet = () => {
  if (!currentDS || isTreeDS.value) return;
  const setVal = inputVal.value;
  const setIdx = inputIdx.value;
  runOp(async () => {
    currentOp.value = '修改数据';
    addMessage(`执行修改: idx=${setIdx}, val=${setVal}`, MessageType.INFO);
    try {
      await currentDS.set(setIdx, setVal);
    } catch (e) {
      addMessage(isCancelError(e) ? '修改操作已取消' : '修改操作执行完毕', MessageType.SUCCESS);
    }
    updateStats();
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
  });
};

const handleClear = async () => {
  stepController.abort();
  currentOp.value = '重新开始';
  if (currentMenu.value === VisualizerType.BINARY_TREE_TRAVERSAL) {
    // 遍历算法：重建示例树
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.BINARY_TREE_TRAVERSAL);
    currentDS = create(BinaryTreeTraversal, buildSampleTraversalTree());
    addMessage('已重新生成示例二叉树', MessageType.SUCCESS);
    return;
  }
  if (currentMenu.value === VisualizerType.BINARY_SEARCH) {
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.BINARY_SEARCH);
    currentDS = create(BinarySearch, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    bsVars.value.left = 0;
    bsVars.value.right = 9;
    bsVars.value.mid = 4;
    addMessage('已重新开始二分查找', MessageType.SUCCESS);
    return;
  }
  // 其余数据结构：执行 clear 复合操作
  addMessage('执行清空', MessageType.INFO);
  try {
    await currentDS.clear();
  } catch (e) {
    addMessage(isCancelError(e) ? '清空操作已取消' : '清空操作执行完毕', MessageType.SUCCESS);
  }
  updateStats();
  stepController.setStatus(StepStatus.PAUSE_OR_FREE);
};

// 设置自定义数组数据（二分查找）
const handleSetData = () => {
  const input = prompt('请输入升序排列的数组，用逗号分隔（例如：1,2,3,5,8,13）', '1,2,3,4,5,6,7,8,9,10');
  if (!input) return;

  try {
    const data = input.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (data.length < 2) {
      addMessage('数组长度至少为2', MessageType.ERROR);
      return;
    }
    // 检查是否升序
    for (let i = 1; i < data.length; i++) {
      if (data[i] < data[i-1]) {
        addMessage('数组必须按升序排列', MessageType.ERROR);
        return;
      }
    }
    // 重新初始化
    DataNode.restart();
    visualizerManager.switchVisualizer(VisualizerType.BINARY_SEARCH);
    currentDS = create(BinarySearch, data);
    addMessage(`已设置新数组: [${data.join(', ')}]`, MessageType.SUCCESS);
    bsVars.value.left = 0;
    bsVars.value.right = data.length - 1;
    bsVars.value.mid = Math.floor((data.length - 1) / 2);
  } catch (e) {
    addMessage('数据格式错误', MessageType.ERROR);
  }
};

// ========== 遍历算法操作 ==========
const handlePreOrder = () => {
  if (!currentDS) return;
  runOp(async () => {
    currentOp.value = '前序遍历';
    try {
      await currentDS.preOrderTraversal();
    } catch (e) {
      addMessage(isCancelError(e) ? '前序遍历已取消' : '前序遍历执行完毕', MessageType.SUCCESS);
    }
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
  });
};

const handleInOrder = () => {
  if (!currentDS) return;
  runOp(async () => {
    currentOp.value = '中序遍历';
    try {
      await currentDS.inOrderTraversal();
    } catch (e) {
      addMessage(isCancelError(e) ? '中序遍历已取消' : '中序遍历执行完毕', MessageType.SUCCESS);
    }
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
  });
};

const handlePostOrder = () => {
  if (!currentDS) return;
  runOp(async () => {
    currentOp.value = '后序遍历';
    try {
      await currentDS.postOrderTraversal();
    } catch (e) {
      addMessage(isCancelError(e) ? '后序遍历已取消' : '后序遍历执行完毕', MessageType.SUCCESS);
    }
    stepController.setStatus(StepStatus.PAUSE_OR_FREE);
  });
};

// ========== 消息处理 ==========
// 判断是否因切换视图/重新开始而被中止（中止时不应误报"执行完毕"）
const isCancelError = (e: unknown): boolean => {
  return e instanceof Error && e.message === '操作已取消';
};

const addMessage = (text: string, type: number) => {
  messages.value.push({ text, type });
  if (messages.value.length > 50) {
    messages.value.shift();
  }
};

const getMessageClass = (type: number) => {
  switch (type) {
    case MessageType.WARNING: return 'msg-warning';
    case MessageType.ERROR: return 'msg-error';
    case MessageType.SUCCESS: return 'msg-success';
    default: return 'msg-info';
  }
};

const getMessageIcon = (type: number) => {
  switch (type) {
    case MessageType.WARNING: return '⚠';
    case MessageType.ERROR: return '✕';
    case MessageType.SUCCESS: return '✓';
    default: return '○';
  }
};

// ========== 生命周期 ==========
let updateTimer: number | null = null;

onMounted(() => {
  if (svgContainer.value) {
    visualizerManager.init(svgContainer.value);
  }

  messageController.setMessageHandler((msg: string, type: number) => {
    addMessage(msg, type);
  });

  selectMenu(currentMenu.value);
  addMessage('系统初始化完成', MessageType.SUCCESS);

  // 定期更新二分查找变量显示
  updateTimer = window.setInterval(() => {
    if (currentMenu.value === VisualizerType.BINARY_SEARCH) {
      const vis = visualizerManager.getCurrentVisualizer() as any;
      if (vis && vis.currentLeft !== null) {
        bsVars.value.left = vis.currentLeft;
        bsVars.value.right = vis.currentRight;
        bsVars.value.mid = vis.currentMid;
      }
    }
  }, 200);
});

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
});
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: 'Microsoft YaHei', system-ui, sans-serif;
  font-size: 14px;
  color: #333;
}

/* ========== 左侧边栏 ========== */
.sidebar {
  flex: 0 0 220px;
  background: #fff;
  border-right: 1px solid #ccc;
  padding: 8px;
  overflow-y: auto;
}

.menu-section {
  margin-bottom: 12px;
}

.menu-section-title {
  font-weight: 600;
  padding: 4px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.menu-subsection {
  margin-left: 16px;
}

.menu-subsection-title {
  padding: 3px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #555;
}

.menu-item {
  padding: 3px 8px 3px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 13px;
}

.menu-item:hover {
  background: #e8f0fe;
}

.menu-item.active {
  background: #d2e3fc;
  color: #1a73e8;
}

/* ========== 中间主区域 ========== */
.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.top-header {
  height: 40px;
  border-bottom: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: #333;
}

.canvas-container {
  flex: 1;
  position: relative;
  background: #fff;
  overflow: hidden;
}

.canvas-svg {
  width: 100%;
  height: 100%;
}

/* 左上角统计信息 */
.stats-panel {
  position: absolute;
  top: 12px;
  left: 16px;
  font-size: 13px;
  color: #333;
  font-family: monospace;
  line-height: 1.8;
  z-index: 1;
  background: rgba(255, 255, 255, 0.85);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #eee;
}

.stat-line {
  margin-bottom: 2px;
}

/* 右上角流程控制 */
.step-controls {
  position: absolute;
  top: 8px;
  right: 16px;
  display: flex;
  gap: 4px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  padding: 4px 8px;
  border-radius: 2px;
  z-index: 1;
}

.control-btn {
  width: 32px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.control-btn:hover {
  background: #ddd;
}

/* ========== 底部消息区 ========== */
.message-panel {
  height: 140px;
  border-top: 1px solid #ccc;
  display: flex;
  flex-direction: column;
}

.message-header {
  height: 28px;
  background: #f0f0f0;
  border-bottom: 1px solid #ccc;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  color: #555;
  gap: 6px;
}

.message-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 12px;
  font-size: 13px;
}

.message-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid #eee;
}

.msg-icon {
  width: 16px;
  text-align: center;
}

.msg-warning {
  color: #e67e22;
}

.msg-error {
  color: #e74c3c;
}

.msg-success {
  color: #27ae60;
}

/* ========== 右侧操作台 ========== */
.control-panel {
  flex: 0 0 200px;
  background: #fff;
  border-left: 1px solid #ccc;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
  text-align: center;
}

.control-group {
  margin-bottom: 4px;
}

.input-field {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 2px;
  font-size: 13px;
  box-sizing: border-box;
  outline: none;
}

.input-field:focus {
  border-color: #1a73e8;
}

.action-btn {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 2px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  text-align: left;
}

.action-btn:hover {
  background: #f5f5f5;
  border-color: #999;
}

.btn-icon {
  font-size: 14px;
}

/* 窄窗口：收缩两侧边栏，优先保证画布区域可用（须放在基础规则之后） */
@media (max-width: 800px) {
  .sidebar {
    flex: 0 0 150px;
    padding: 4px;
  }
  .control-panel {
    flex: 0 0 140px;
    padding: 8px;
  }
  .menu-item {
    padding-left: 12px;
    font-size: 12px;
  }
  .action-btn {
    padding: 6px 8px;
    font-size: 12px;
  }
}
</style>
