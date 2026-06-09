import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Space, Tag, Input, Select, Modal, Form,
  InputNumber, message, Popconfirm, Descriptions, Typography, Tooltip,
  Progress, List, Alert, Empty,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, ReloadOutlined, HomeOutlined, UserAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { cageApi, animalApi } from '../api';

const { Option } = Select;
const { TextArea } = Input;

const statusOptions = [
  { value: 'idle', label: '空闲', color: 'default' },
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

const getOccupancyStrokeColor = (rate: number) => {
  if (rate >= 100) return '#cf1322';
  if (rate >= 80) return '#faad14';
  return '#4f46e5';
};

const CageList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [assignVisible, setAssignVisible] = useState(false);
  const [editingCage, setEditingCage] = useState<any>(null);
  const [detailCage, setDetailCage] = useState<any>(null);
  const [allAnimals, setAllAnimals] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await cageApi.getList({
        page, pageSize, keyword: keyword || undefined, status: statusFilter,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter]);

  const fetchAnimals = async () => {
    try {
      const res: any = await animalApi.getList({ page: 1, pageSize: 500 });
      setAllAnimals(res?.list || []);
    } catch {
      // handled
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchAnimals(); }, []);

  const handleAdd = () => {
    setEditingCage(null);
    form.resetFields();
    form.setFieldsValue({ status: 'idle', capacity: 5 });
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingCage(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const refreshDetail = async (id: number) => {
    try {
      const res: any = await cageApi.getDetail(id);
      setDetailCage(res);
      return res;
    } catch {
      return null;
    }
  };

  const handleDetail = async (id: number) => {
    const res = await refreshDetail(id);
    if (res) setDetailVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await cageApi.delete(id);
      message.success('删除成功');
      fetchData();
    } catch {
      // handled
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCage) {
        await cageApi.update(editingCage.id, values);
        message.success('更新成功');
      } else {
        await cageApi.create(values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchData();
    } catch {
      // handled
    }
  };

  const handleAssignAnimal = async () => {
    try {
      const values = await assignForm.validateFields();
      await cageApi.assignAnimal(detailCage.id, values.animalId);
      message.success('分配成功');
      setAssignVisible(false);
      assignForm.resetFields();
      await refreshDetail(detailCage.id);
      fetchData();
      fetchAnimals();
    } catch {
      // handled
    }
  };

  const handleRemoveAnimal = async (animalId: number) => {
    try {
      await cageApi.removeAnimal(detailCage.id, animalId);
      message.success('已移出');
      await refreshDetail(detailCage.id);
      fetchData();
      fetchAnimals();
    } catch {
      // handled
    }
  };

  const columns = [
    {
      title: '笼舍编号',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      fixed: 'left' as const,
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    { title: '所在房间', dataIndex: 'room', key: 'room', width: 130, ellipsis: true },
    { title: '笼舍类型', dataIndex: 'type', key: 'type', width: 100 },
    {
      title: '最大容量',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      render: (v: number) => `${v}`,
    },
    {
      title: '当前已养',
      dataIndex: 'currentCount',
      key: 'currentCount',
      width: 100,
      render: (v: number, record: any) => (
        <Typography.Text strong style={{ color: v >= record.capacity ? '#cf1322' : undefined }}>
          {v}
        </Typography.Text>
      ),
    },
    {
      title: '占用率',
      dataIndex: 'occupancyRate',
      key: 'occupancyRate',
      width: 180,
      render: (rate: number, record: any) => {
        const display = Math.min(rate, 100);
        return (
          <Tooltip title={`${record.currentCount}/${record.capacity}`}>
            <Progress
              percent={display}
              size="small"
              strokeColor={getOccupancyStrokeColor(rate)}
              format={() => `${rate}%`}
            />
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const opt = statusOptions.find(o => o.value === status);
        return <Tag color={opt?.color}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleDetail(record.id)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="确定删除该笼舍吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Tooltip title="删除">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 详情弹窗中可分配的动物（未分配到任何笼舍 或 不在当前笼舍）
  const availableAnimals = allAnimals.filter(
    (a) => !a.cageId || a.cageId !== detailCage?.id,
  );

  const isFull = detailCage && detailCage.currentCount >= detailCage.capacity;
  const isAlmostFull = detailCage && !isFull && detailCage.occupancyRate >= 80;

  return (
    <div>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        title={
          <Space>
            <HomeOutlined style={{ color: '#4f46e5' }} />
            <span style={{ fontWeight: 600 }}>笼舍管理</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增笼舍
          </Button>
        }
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="搜索笼舍编号"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => { setPage(1); fetchData(); }}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
          >
            {statusOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setStatusFilter(undefined); setPage(1); }}>
            重置
          </Button>
        </div>

        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1080 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条记录`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingCage ? '编辑笼舍' : '新增笼舍'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={640}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="code" label="笼舍编号" rules={[{ required: true, message: '请输入笼舍编号' }]}>
              <Input placeholder="如 A-101" />
            </Form.Item>
            <Form.Item name="room" label="所在房间">
              <Input placeholder="如 A栋101室" />
            </Form.Item>
            <Form.Item name="type" label="笼舍类型">
              <Input placeholder="如 小鼠笼/大鼠笼" />
            </Form.Item>
            <Form.Item name="capacity" label="最大容量" rules={[{ required: true, message: '请输入最大容量' }]}>
              <InputNumber style={{ width: '100%' }} min={1} max={1000} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select>
                {statusOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="description" label="备注">
            <TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="笼舍详细信息"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={820}
        destroyOnClose
      >
        {detailCage && (
          <>
            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="笼舍编号">{detailCage.code}</Descriptions.Item>
              <Descriptions.Item label="所在房间">{detailCage.room || '-'}</Descriptions.Item>
              <Descriptions.Item label="笼舍类型">{detailCage.type || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusOptions.find(o => o.value === detailCage.status)?.color}>
                  {statusOptions.find(o => o.value === detailCage.status)?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最大容量">{detailCage.capacity}</Descriptions.Item>
              <Descriptions.Item label="当前已养">
                <Typography.Text strong style={{ color: isFull ? '#cf1322' : undefined }}>
                  {detailCage.currentCount} / {detailCage.capacity}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="占用率" span={2}>
                <Progress
                  percent={Math.min(detailCage.occupancyRate, 100)}
                  strokeColor={getOccupancyStrokeColor(detailCage.occupancyRate)}
                  format={() => `${detailCage.occupancyRate}%`}
                />
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detailCage.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{detailCage.createdAt ? dayjs(detailCage.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{detailCage.updatedAt ? dayjs(detailCage.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
            </Descriptions>

            {isFull && (
              <Alert
                style={{ marginTop: 16 }}
                type="error"
                showIcon
                message="该笼舍已满员"
                description="不能继续向此笼舍分配动物，如需分配请先移出动物或调整容量。"
              />
            )}
            {isAlmostFull && (
              <Alert
                style={{ marginTop: 16 }}
                type="warning"
                showIcon
                message={`占用率已达 ${detailCage.occupancyRate}%，即将满员`}
              />
            )}

            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>笼内动物</Typography.Title>
                <Button
                  type="primary"
                  size="small"
                  icon={<UserAddOutlined />}
                  disabled={isFull || detailCage.status === 'maintenance'}
                  onClick={() => { assignForm.resetFields(); setAssignVisible(true); }}
                >
                  分配动物
                </Button>
              </div>
              {(!detailCage.animals || detailCage.animals.length === 0) ? (
                <Empty description="暂无动物" />
              ) : (
                <List
                  size="small"
                  bordered
                  dataSource={detailCage.animals}
                  renderItem={(animal: any) => {
                    const opt = animalStatusOptions.find(o => o.value === animal.status);
                    return (
                      <List.Item
                        actions={[
                          <Popconfirm
                            title="确定将该动物移出笼舍？"
                            onConfirm={() => handleRemoveAnimal(animal.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button type="link" size="small" danger>移出</Button>
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Typography.Text strong>{animal.name}</Typography.Text>
                              <Tag color={opt?.color}>{opt?.label || animal.status}</Tag>
                            </Space>
                          }
                          description={`${animal.species}${animal.breed ? ' · ' + animal.breed : ''}`}
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Assign Animal Modal */}
      <Modal
        title="分配动物到笼舍"
        open={assignVisible}
        onOk={handleAssignAnimal}
        onCancel={() => setAssignVisible(false)}
        okText="确定分配"
        cancelText="取消"
        destroyOnClose
      >
        {detailCage && (
          <>
            <Alert
              style={{ marginBottom: 16 }}
              type="info"
              showIcon
              message={`当前 ${detailCage.currentCount}/${detailCage.capacity}，剩余 ${detailCage.capacity - detailCage.currentCount} 个名额`}
            />
            <Form form={assignForm} layout="vertical">
              <Form.Item
                name="animalId"
                label="选择动物"
                rules={[{ required: true, message: '请选择要分配的动物' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="children"
                  placeholder="搜索动物编号或物种"
                >
                  {availableAnimals.map(a => (
                    <Option key={a.id} value={a.id}>
                      {a.name} ({a.species}{a.breed ? ' - ' + a.breed : ''})
                      {a.cageNumber ? ` 当前在 ${a.cageNumber}` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default CageList;
