type AvatarPerson = {
  id: number;
  initials: string;
  photo?: string | null;
};

type AvatarStackProps = {
  people: AvatarPerson[];
  count: number;
};

export function AvatarStack({ people, count }: AvatarStackProps) {
  if (count <= 0) {
    return <span className="course-enrolled">No enrollments yet</span>;
  }

  return (
    <span className="course-enrolled-row">
      {people.length > 0 && (
        <span className="avatar-stack" aria-hidden>
          {people.slice(0, 3).map((person, index) =>
            person.photo ? (
              <img key={person.id} src={person.photo} alt="" className="avatar-stack-item" data-i={index} />
            ) : (
              <span key={person.id} className="avatar-stack-item" data-i={index}>
                {person.initials}
              </span>
            )
          )}
        </span>
      )}
      <span className="course-enrolled">
        {count} enrolled
      </span>
    </span>
  );
}
