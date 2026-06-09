import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, Input, Select, Modal, Form,
  InputNumber, Progress, message, Popconfirm, Tooltip, Typography, Badge,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, ReloadOutlined, HomeOutlined,
} from '@ant-design/icons';
import { cageApi } from '../api';

const { Option } = Select;
const { TextArea } = Input;

const statusOptions = [
  { value: 'idle', label: '空闲', color: 'success' },
  { value: 'in_use', label: '使用中', color: 'processing' },
  { value: 'full', label: '满员', color: 'error' },
  { value: 'maintenance', label: '维护中', color: 'warning' },
];

const typeOptions = [
  { value: 'mouse', label: '小鼠笼' },
  { value: 'rat', label: '大鼠笼' },
  { value: 'rabbit', label: '兔笼' },
  { value: 'guinea_pig', label: '豚鼠笼' },
  { value: 'other', label: '其他' },
];

const CageList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCage, setEditingCage] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await cageApi.getList({
        page, pageSize,
        keyword: keyword || undefined,
        status: statusFilter,
      });
      setData(res?.list || []);
      setTotal(res?.total || 0);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = () => {
    setEditingCage(null);
    form.resetFields();
    form.setFieldsValue({ type: 'mouse', maxCapacity: 5, status: 'idle' });
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingCage(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDetail = (id: number) => {
    navigate(`/cages/${id}`);
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
      // validation or api error
    }
  };

  const getStatusTag = (status: string, computedStatus?: string) => {
    const displayStatus = computedStatus || status;
    const opt = statusOptions.find(o => o.value === displayStatus);
    return <Tag color={opt?.color}>{opt?.label || displayStatus}</Tag>;
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 100) return '#ff4d4f';
    if (rate >= 80) return '#faad14';
    if (rate >= 50) return '#1890ff';
    return '#52c41a';
  };

  const columns = [
    {
      title: '笼舍编号',
      dataIndex: 'cageCode',
      key: 'cageCode',
      width: 120,
      fixed: 'left' as const,
      render: (text: string) => (
        <Space>
          <HomeOutlined style={{ color: '#4f46e5' }} />
          <Typography.Text strong>{text}</Typography.Text>
        </Space>
      ),
    },
    { title: '所在房间', dataIndex: 'room', key: 'room', width: 140 },
    {
      title: '笼舍类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t: string) => typeOptions.find(o => o.value === t)?.label || t,
    },
    {
      title: '容量',
      key: 'capacity',
      width: 100,
      render: (_: any, record: any) => (
        <span>{record.currentCount} / {record.maxCapacity}</span>
      ),
    },
    {
      title: '占用率',
      key: 'occupancy',
      width: 160,
      render: (_: any, record: any) => (
        <Progress
          percent={record.occupancyRate}
          size="small"
          strokeColor={getOccupancyColor(record.occupancyRate)}
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: any) => {
        if (record.occupancyRate >= 80 && record.computedStatus !== 'maintenance' && record.occupancyRate < 100) {
          return (
            <Badge dot color="orange" offset={[4, 0]}>
              {getStatusTag(status, record.computedStatus)}
            </Badge>
          );
        }
        return getStatusTag(status, record.computedStatus);
      },
    },
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleDetail(record.id)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="确定删除该笼舍吗？"
            description="有动物的笼舍无法删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        title={<span style={{ fontWeight: 600 }}>笼舍管理</span>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增笼舍
          </Button>
        }
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="搜索笼舍编号/房间"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => { setPage(1); fetchData(); }}
            style={{ width: 220 }}
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
          scroll={{ x: 900 }}
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

      <Modal
        title={editingCage ? '编辑笼舍' : '新增笼舍'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={560}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="cageCode" label="笼舍编号" rules={[{ required: true, message: '请输入笼舍编号' }]}>
              <Input placeholder="如 A-101" />
            </Form.Item>
            <Form.Item name="room" label="所在房间" rules={[{ required: true, message: '请输入所在房间' }]}>
              <Input placeholder="如 A区饲养室1" />
            </Form.Item>
            <Form.Item name="type" label="笼舍类型" rules={[{ required: true }]}>
              <Select>
                {typeOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="maxCapacity" label="最大容量（只）" rules={[{ required: true, message: '请输入最大容量' }]}>
              <InputNumber style={{ width: '100%' }} min={1} max={100} />
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
    </div>
  );
};

export default CageList;
