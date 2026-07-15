export type SkillBadgeOption = {
  key: string;
  label: string;
  color: string;
  aliases: string[];
};

export const skillBadgeOptions: SkillBadgeOption[] = [
  { key: 'java', label: 'Java', color: 'ED8B00', aliases: ['java'] },
  { key: 'typescript', label: 'TypeScript', color: '3178C6', aliases: ['typescript'] },
  { key: 'python', label: 'Python', color: '3776AB', aliases: ['python'] },
  { key: 'nodedotjs', label: 'Node.js', color: '5FA04E', aliases: ['nodejs', 'node.js'] },
  { key: 'html5', label: 'HTML5', color: 'E34F26', aliases: ['html', 'html/css', 'html5'] },
  { key: 'css', label: 'CSS', color: '663399', aliases: ['css', 'css3'] },
  { key: 'springboot', label: 'Spring Boot', color: '6DB33F', aliases: ['spring', 'spring boot'] },
  { key: 'spring', label: 'Spring Data JPA', color: '6DB33F', aliases: ['spring data jpa', 'jpa'] },
  { key: 'springsecurity', label: 'Spring Security', color: '6DB33F', aliases: ['spring security'] },
  { key: 'fastapi', label: 'FastAPI', color: '009688', aliases: ['fastapi'] },
  { key: 'nestjs', label: 'NestJS', color: 'E0234E', aliases: ['nestjs'] },
  { key: 'express', label: 'Express', color: '000000', aliases: ['express', 'expressjs'] },
  { key: 'react', label: 'React', color: '61DAFB', aliases: ['react', 'reactjs'] },
  { key: 'django', label: 'Django', color: '092E20', aliases: ['django'] },
  { key: 'mongodb', label: 'MongoDB', color: '47A248', aliases: ['mongodb'] },
  { key: 'redis', label: 'Redis', color: 'FF4438', aliases: ['redis'] },
  { key: 'mysql', label: 'MySQL / SQL', color: '4479A1', aliases: ['mysql', 'sql'] },
  { key: 'postgresql', label: 'PostgreSQL', color: '4169E1', aliases: ['postgresql', 'postgres'] },
  { key: 'grpc', label: 'gRPC', color: '244C5A', aliases: ['grpc'] },
  { key: 'microsoftazure', label: 'Microsoft Azure', color: '0078D4', aliases: ['azure', 'cosmos db', 'bicep', 'azure functions'] },
  { key: 'microsoftexcel', label: 'Microsoft Excel', color: '217346', aliases: ['excel'] },
  { key: 'microsoftaccess', label: 'Microsoft Access', color: 'A4373A', aliases: ['access'] },
  { key: 'flyway', label: 'Flyway', color: 'CC0200', aliases: ['flyway'] },
  { key: 'playwright', label: 'Playwright', color: '2EAD33', aliases: ['playwright'] },
  { key: 'n8n', label: 'n8n', color: 'EA4B71', aliases: ['n8n'] },
  { key: 'nginx', label: 'NGINX', color: '009639', aliases: ['nginx'] },
  { key: 'docker', label: 'Docker', color: '2496ED', aliases: ['docker', 'docker compose'] },
  { key: 'grafana', label: 'Grafana', color: 'F46800', aliases: ['grafana', 'loki', 'alloy'] },
  { key: 'kubernetes', label: 'Kubernetes', color: '326CE5', aliases: ['kubernetes'] },
  { key: 'amazonecs', label: 'AWS ECS', color: 'FF9900', aliases: ['aws ecs', 'amazon ecs'] },
  { key: 'amazonsqs', label: 'Amazon SQS', color: 'FF4F8B', aliases: ['amazon sqs', 'aws sqs', 'sqs'] },
  { key: 'datadog', label: 'Datadog', color: '632CA6', aliases: ['datadog'] },
  { key: 'apachekafka', label: 'Apache Kafka', color: '231F20', aliases: ['kafka'] },
  { key: 'openai', label: 'OpenAI / LLM', color: '412991', aliases: ['openai', 'azure openai', 'llm', 'rag'] },
  { key: 'langchain', label: 'LangChain', color: '1C3C3C', aliases: ['langchain', 'langgraph'] },
  { key: 'microsoftteams', label: 'Microsoft Teams', color: '6264A7', aliases: ['teams', 'teams sdk'] },
  { key: 'githubactions', label: 'GitHub Actions', color: '2088FF', aliases: ['github actions'] },
  { key: 'git', label: 'Git', color: 'F05032', aliases: ['git'] },
];

const normalizeSkillName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function recommendSkillBadge(skillName: string): SkillBadgeOption | undefined {
  const normalized = normalizeSkillName(skillName);
  return skillBadgeOptions.find((option) => option.aliases.includes(normalized));
}

export function findSkillBadge(key?: string | null): SkillBadgeOption | undefined {
  return skillBadgeOptions.find((option) => option.key === key);
}

export function resolveSkillBadge(
  skillName: string,
  badgeKey?: string | null,
  badgeColor?: string | null,
) {
  const recommended = recommendSkillBadge(skillName);
  const key = badgeKey?.trim() || recommended?.key;
  if (!key) return undefined;
  const option = findSkillBadge(key);
  const color = badgeColor?.trim() || option?.color || recommended?.color || '64748B';
  return { key, color: /^[0-9A-Fa-f]{6}$/.test(color) ? color.toUpperCase() : '64748B' };
}

export function buildSkillBadgeUrl(key: string, color: string) {
  return `https://cdn.simpleicons.org/${encodeURIComponent(key)}/${encodeURIComponent(color)}?viewbox=auto`;
}
