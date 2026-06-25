import { Car, EV, Check, Clock } from './Icons';

export default function SectionHighlights() {
  const features = [
    {
      icon: <Car size={20} />,
      title: 'Fast Guest Check-In',
      text: 'Enter your plate and get a live slot assignment in seconds.'
    },
    {
      icon: <EV size={20} />,
      title: 'EV & Disabled Bays',
      text: 'Dedicated parking categories for specialized vehicles and accessibility.'
    },
    {
      icon: <Clock size={20} />,
      title: 'Smart Billing',
      text: 'Instant checkout fees and clear entry history for every session.'
    }
  ];

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, rgba(22,163,74,0.14), rgba(249,115,22,0.12))',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '22px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 18px 45px rgba(15, 23, 42, 0.16)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ maxWidth: '620px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(15, 23, 42, 0.65)', color: '#d1fae5', fontSize: '12px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            <Check size={14} />
            New smart section
          </div>
          <h2 style={{ margin: '10px 0 8px', color: 'var(--text-primary)', fontSize: '28px' }}>
            A smoother parking experience for every visitor.
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            This new section highlights key features such as quick vehicle check-in, dedicated parking zones, and transparent billing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(150px, 1fr))', gap: '12px', flex: '1 1 320px' }}>
          {features.map((feature, index) => (
            <div key={index} style={{ background: 'rgba(255,255,255,0.78)', borderRadius: '16px', padding: '14px', color: 'var(--text-primary)' }}>
              <div style={{ display: 'inline-flex', padding: '8px', borderRadius: '10px', background: 'rgba(22,163,74,0.12)', color: 'var(--primary)', marginBottom: '8px' }}>
                {feature.icon}
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '14px' }}>{feature.title}</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
