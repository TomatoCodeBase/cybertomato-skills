---
name: pytorch-fsdp
description: PyTorch FSDP分布式训练指南——参数分片、混合精度、CPU卸载、FSDP2
dependencies: [torch>=2.0, transformers]
---

# PyTorch FSDP

## 何时使用
配置FSDP/FSDP2训练、调试分片/显存问题、CPU offloading、mixed precision选择

## 核心API速查

### 初始化
```python
import torch.distributed as dist
dist.init_process_group(backend="nccl")  # CUDA用nccl，CPU用gloo

# FSDP2推荐：device_mesh
from torch.distributed.device_mesh import init_device_mesh
mesh_1d = init_device_mesh("cuda", mesh_shape=(8,))
mesh_2d = init_device_mesh("cuda", mesh_shape=(2, 8), mesh_dim_names=("dp", "tp"))
```

### FSDP1 包装
```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP
from torch.distributed.fsdp import MixedPrecision, CPUOffload

model = FSDP(model,
    sharding_strategy=ShardingStrategy.FULL_SHARD,  # 完全分片
    mixed_precision=MixedPrecision(
        param_dtype=torch.bfloat16,
        reduce_dtype=torch.bfloat16,
        buffer_dtype=torch.bfloat16,
    ),
    cpu_offload=CPUOffload(offload_params=True),  # CPU卸载省显存
    device_id=torch.cuda.current_device(),
)
```

### FSDP2 包装
```python
from torch.distributed.fsdp import FSDPModule
# FSDP2用device_mesh + FSDPModule，更简洁
model = FSDPModule(model, mesh=mesh_1d)
```

### 不均匀输入（Join）
```python
from torch.distributed.algorithms import Join
with Join([model]):
    output = model(input)
```

### 进程组
```python
group = dist.new_group(ranks=[0, 1, 2], backend="nccl")
# NCCL多进程组注意：必须全局一致执行顺序，async操作后需wait()再切组
```

## 关键决策点

| 场景 | 推荐 |
|------|------|
| 多GPU训练 | FSDP > DDP（显存更优） |
| 后端选择 | CUDA→NCCL, CPU→gloo |
| 混合精度 | bf16（A100+/H100），fp16（V100） |
| CPU Offload | 极端显存不足时启用，否则慢2-3x |
| FSDP1 vs FSDP2 | 新项目用FSDP2（torch>=2.2），旧项目继续FSDP1 |
| static_graph | 图不变时设True，提升性能 |

## 踩坑

1. **NCCL多进程组并发**：async操作后必须`work.wait()`再切组，否则死锁
2. **init_process_group非线程安全**：单线程创建，防止UUID竞态
3. **CPU offload性能代价**：省显存但慢2-3x，优先试sharding
4. **find_unused_parameters**：有未用参数时必须True，否则梯度不同步；static_graph=True时可省
5. **DDP+RPC**：必须用`dist_autograd.backward()`而非`loss.backward()`
6. **Windows支持**：仅prototype，不支持NCCL后端
7. **FSDP2要求torch>=2.2**，2.0/2.1只能用FSDP1
8. **Join上下文**：不均匀数据必须用Join，否则挂死

## 官方文档

- FSDP教程: https://pytorch.org/tutorials/intermediate/FSDP_tutorial.html
- FSDP2 API: https://pytorch.org/docs/stable/fsdp2.html
- torch.distributed: https://pytorch.org/docs/stable/distributed.html
- Device Mesh: https://pytorch.org/docs/stable/distributed.device_mesh.html
