import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Select, message, Popconfirm,
  Descriptions, Typography, Progress, Tooltip, Alert,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { cageApi } from '../api';

const { Option } = Select;

const statusOptions = [
  { value: 'available', label: '空闲', color: 'default' },
  { value: 'in_use', label: '使用中', color: 'processing' },
  { value: 'full', label: '满员', color: 'error' },
  { value: 'maintenance', label: '维护中', color: 'warning' },
];

const animalStatusOptions = [
  { value: 'healthy', label: '健康', color: 'success' },
  { value: 'sick', label: '患病', color: 'error' },
  { value: 'in_experiment', label: '实验中', color: 'processing' },
  { value: 'deceased', label: '已死亡', color: 'default' },
  { value: 'quarantine', label: '隔离中', color: 'warning' },
];

const CageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cage, setCage] = useState<any>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [availableAnimals, setAvailableAnimals] = useState<any[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | undefined>();

  const fetchCage = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res: any = await cageApi.getDetail(Number(id));
      setCage(res);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCage(); }, [fetchCage]);

  const handleAssignOpen = async () => {
    try {
      const res: any = await cageApi.getAvailableAnimals();
      setAvailableAnimals(Array.isArray(res) ? res : []);
      setSelectedAnimalId(undefined);
      setAssignModalVisible(true);
    } catch {
    }
  };

  const handleAssign = async () => {
    if (!id || !selectedAnimalId) {
      message.warning('请选择要分配的动物');
      return;
    }
    try {
      await cageApi.assignAnimal(Number(id), selectedAnimalId);
      message.success('动物分配成功');
      setAssignModalVisible(false);
      fetchCage();
    } catch {
    }
  };

  const handleRemove = async (animalId: number) => {
    if (!id) return;
    try {
      await cageApi.removeAnimal(Number(id), animalId);
      message.success('动物移出成功');
      fetchCage();
    } catch {
    }
  };

  if (!cage) {
    return (
      <Card loading={loading}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/cages')}>返回笼舍列表</Button>
      </Card>
    );
  }

  const currentCount = cage.currentCount || 0;
  const maxCapacity = cage.maxCapacity || 0;
  const occupancyRate = cage.occupancyRate || 0;
  const isFull = currentCount >= maxCapacity;
  const isNearFull = maxCapacity > 0 && currentCount / maxCapacity >= 0.8 && !isFull;

  const getOccupancyColor = (rate: number) => {
    if (rate >= 100) return '#ff4d4f';
    if (rate >= 80) return '#faad14';
    if (rate >= 50) return '#1890ff';
    return '#52c41a';
  };

  const animalColumns = [
    {
      title: '编号',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    { title: '物种', dataIndex: 'species', key: 'species', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const opt = animalStatusOptions.find(o => o.value === status);
        return <Tag color={opt?.color}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Popconfirm title={`确定将 ${record.name} 从该笼舍移出吗？`} onConfirm={() => handleRemove(record.id)} okText="确定" cancelText="取消">
          <Tooltip title="移出笼舍">
            <Button type="link" size="small" danger icon={<MinusCircleOutlined />}>移出</Button>
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/cages')}
        style={{ marginBottom: 16 }}
      >
        返回笼舍列表
      </Button>

      {isNearFull && (
        <Alert
          message="容量提醒"
          description={`该笼舍占用率已达 ${occupancyRate}%，即将满员，请注意！`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {isFull && (
        <Alert
          message="容量已满"
          description="该笼舍已满员，无法继续分配动物！"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}
        title={<span style={{ fontWeight: 600 }}>笼舍信息</span>}
      >
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="编号">
            <Typography.Text strong>{cage.cageNumber}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="所在房间">{cage.room}</Descriptions.Item>
          <Descriptions.Item label="笼舍类型">{cage.cageType}</Descriptions.Item>
          <Descriptions.Item label="最大容量">{maxCapacity} 只</Descriptions.Item>
          <Descriptions.Item label="已养数量">
            <span style={{ color: isFull ? '#ff4d4f' : isNearFull ? '#faad14' : undefined, fontWeight: isFull || isNearFull ? 600 : undefined }}>
              {currentCount} 只
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="占用率">
            <Progress
              percent={occupancyRate}
              size="small"
              strokeColor={getOccupancyColor(occupancyRate)}
              style={{ maxWidth: 160 }}
              format={(p) => `${p}%`}
            />
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusOptions.find(o => o.value === cage.status)?.color}>
              {statusOptions.find(o => o.value === cage.status)?.label}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>{cage.description || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        title={<span style={{ fontWeight: 600 }}>笼内动物</span>}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAssignOpen}
            disabled={isFull || cage.status === 'maintenance'}
          >
            分配动物
          </Button>
        }
      >
        <Table
          loading={loading}
          dataSource={cage.animals || []}
          columns={animalColumns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无动物' }}
        />
      </Card>

      <Modal
        title="分配动物到笼舍"
        open={assignModalVisible}
        onOk={handleAssign}
        onCancel={() => setAssignModalVisible(false)}
        okText="确认分配"
        cancelText="取消"
        okButtonProps={{ disabled: !selectedAnimalId }}
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12, color: '#666' }}>
            当前笼舍：{cage.cageNumber} | 已养：{currentCount}/{maxCapacity}
            {isFull && <Tag color="error" style={{ marginLeft: 8 }}>已满</Tag>}
          </div>
          <Select
            placeholder="选择要分配的动物"
            style={{ width: '100%' }}
            value={selectedAnimalId}
            onChange={setSelectedAnimalId}
            showSearch
            optionFilterProp="children"
          >
            {availableAnimals.map((a: any) => (
              <Option key={a.id} value={a.id}>
                {a.name} - {a.species} ({animalStatusOptions.find(o => o.value === a.status)?.label || a.status})
              </Option>
            ))}
          </Select>
          {availableAnimals.length === 0 && (
            <div style={{ marginTop: 8, color: '#999' }}>暂无可分配的动物（所有动物均已分配笼舍）</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CageDetail;
