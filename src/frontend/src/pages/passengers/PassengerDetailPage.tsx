import { Col, Descriptions, Row } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { EntityHero } from '@components/common/EntityHero';
import { PageHeader } from '@components/common/PageHeader';
import { PageSkeleton } from '@components/common/PageSkeleton';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useGetPassengerById } from '@hooks/usePassengers';
import { passengerTypeLabels, formatDateTime } from '@utils/format';
import { getPassengerTone } from '@utils/presentation';
import { parseRouteId } from '@utils/helpers';

export const PassengerDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const passengerId = parseRouteId(id);

  const passengerQuery = useGetPassengerById(passengerId);
  const passenger = passengerQuery.data;

  if (passengerQuery.isLoading && !passenger) {
    return <PageSkeleton variant="detail" />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Passenger profile"
        title="Passenger details"
        subtitle="Passenger details are organized with a hero summary and grouped information cards."
        onBack={() => navigate('/passengers')}
      />

      {passenger && (
        <>
          <EntityHero
            eyebrow="Passenger record"
            title={`${passenger.name} · ${passenger.passportNumber}`}
            subtitle={`Passenger type ${passengerTypeLabels[passenger.passengerType]} · Linked user ${passenger.userId}`}
            tags={<StatusPill label={passengerTypeLabels[passenger.passengerType]} tone={getPassengerTone(passenger.passengerType)} />}
            meta={`PSG-${passenger.id} · Created ${formatDateTime(passenger.createdAt)}`}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <SectionCard title="Passenger details" subtitle="Identity and document fields">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="ID">{passenger.id}</Descriptions.Item>
                  <Descriptions.Item label="Name">{passenger.name}</Descriptions.Item>
                  <Descriptions.Item label="Age">{passenger.age}</Descriptions.Item>
                  <Descriptions.Item label="Passport number">{passenger.passportNumber}</Descriptions.Item>
                </Descriptions>
              </SectionCard>
            </Col>
            <Col xs={24} xl={12}>
              <SectionCard title="Profile audit" subtitle="Type and timestamps">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="User link">{passenger.userId}</Descriptions.Item>
                  <Descriptions.Item label="Passenger type">
                    <StatusPill label={passengerTypeLabels[passenger.passengerType]} tone={getPassengerTone(passenger.passengerType)} subtle />
                  </Descriptions.Item>
                  <Descriptions.Item label="Created at">{formatDateTime(passenger.createdAt)}</Descriptions.Item>
                  <Descriptions.Item label="Updated at">{formatDateTime(passenger.updatedAt)}</Descriptions.Item>
                </Descriptions>
              </SectionCard>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};
